import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiCheckCircle, FiClipboard, FiPlus, FiSearch } from 'react-icons/fi';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import HRLayout from '../../layout/hr/HRLayout';
import {
  formatDate,
  getFullName,
  type HrOnboardingPlan,
  type HrOnboardingTask,
  type HrOverviewResponse,
  useHrOverview,
} from './hrData';

type NotificationState = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
};

type MutationError = Error & {
  fieldErrors?: Record<string, string>;
};

type TaskFormState = {
  title: string;
  category: string;
  owner: string;
  dueDate: string;
};

const emptyTaskForm: TaskFormState = {
  title: '',
  category: 'General',
  owner: 'HR',
  dueDate: '',
};

function HrOnboarding() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, hrOverviewQuery } = useHrOverview();
  const [searchValue, setSearchValue] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<HrOnboardingPlan | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const plans = hrOverviewQuery.data?.onboardingPlans ?? [];
  const filteredPlans = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return plans;
    }

    return plans.filter((plan) =>
      [
        plan.employeeName,
        plan.employeeNumber,
        plan.department,
        plan.employeeRole,
        plan.status,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [plans, searchValue]);

  const addTaskMutation = useMutation({
    mutationFn: async (payload: { employeeId: string; form: TaskFormState }) => {
      const response = await fetch(`/api/hr/employees/${payload.employeeId}/onboarding/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload.form),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: HrOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to add onboarding task') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        message: data.message ?? 'Onboarding task added',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['hr-overview'], result.data);
      setSelectedPlan(null);
      setTaskForm(emptyTaskForm);
      setFieldErrors({});
      setNotification({
        open: true,
        title: 'Task added',
        message: result.message,
        variant: 'success',
      });
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to add task',
        message: error.message || 'Review the task details and try again.',
        variant: 'error',
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (payload: {
      planId: string;
      task: HrOnboardingTask;
      isCompleted: boolean;
    }) => {
      const response = await fetch(`/api/hr/onboarding/${payload.planId}/tasks/${payload.task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: payload.task.title,
          category: payload.task.category,
          owner: payload.task.owner,
          dueDate: payload.task.dueDate,
          isCompleted: payload.isCompleted,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: HrOverviewResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Unable to update onboarding task');
      }

      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['hr-overview'], data);
    },
    onError: (error: Error) => {
      setNotification({
        open: true,
        title: 'Unable to update task',
        message: error.message || 'Try again in a moment.',
        variant: 'error',
      });
    },
  });

  function openTaskModal(plan: HrOnboardingPlan) {
    setSelectedPlan(plan);
    setTaskForm({
      ...emptyTaskForm,
      dueDate: plan.dueDate,
    });
    setFieldErrors({});
  }

  function saveTask() {
    const nextErrors: Record<string, string> = {};

    if (!taskForm.title.trim()) {
      nextErrors.title = 'Required';
    }

    if (!selectedPlan) {
      nextErrors.employeeId = 'Choose employee';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    if (!selectedPlan) {
      return;
    }

    addTaskMutation.mutate({
      employeeId: selectedPlan.employeeId,
      form: {
        title: taskForm.title.trim(),
        category: taskForm.category.trim() || 'General',
        owner: taskForm.owner.trim() || 'HR',
        dueDate: taskForm.dueDate,
      },
    });
  }

  if (!activeUser || isError) {
    return null;
  }

  const fullName = getFullName(activeUser);

  return (
    <HRLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.department || activeUser.section || 'Human Resources'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageTitle="Onboarding"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="mx-auto w-full max-w-[15.68rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[0.24rem] border border-[#c8d7ca] bg-[linear-gradient(135deg,rgba(252,254,252,0.98)_0%,rgba(237,245,239,0.96)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(58,88,64,0.07)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#718f76]">
                Onboarding plans
              </p>
              <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.04em] text-[#183b25]">
                Keep every new employee moving through records, access, and payroll setup.
              </h1>
            </div>
            <label className="flex w-full min-w-0 items-center gap-3 rounded-[0.16rem] border border-[#c8d7ca] bg-white px-4 py-2.5 text-[#718f76] lg:w-[4rem]">
              <FiSearch className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search onboarding"
                className="w-full bg-transparent text-fluid-base text-[#23452d] outline-none placeholder:text-[#8da594]"
              />
            </label>
          </div>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {hrOverviewQuery.isLoading ? (
            <EmptyState title="Loading onboarding..." description="Plans are being prepared." />
          ) : filteredPlans.length ? (
            filteredPlans.map((plan) => (
              <section
                key={plan.id}
                className="rounded-[0.232rem] border border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] p-5 shadow-[0_14px_28px_rgba(58,88,64,0.06)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-fluid-xl font-semibold text-[#183b25]">
                      {plan.employeeName}
                    </p>
                    <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">
                      {plan.department} | {plan.employeeRole} | Due {formatDate(plan.dueDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe0d2] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#587a60]">
                      <FiClipboard className="h-4 w-4" />
                      {plan.completedTaskCount}/{plan.taskCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => openTaskModal(plan)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[0.144rem] border border-[#2f8a52] bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] text-white transition hover:brightness-105"
                      aria-label={`Add task for ${plan.employeeName}`}
                    >
                      <FiPlus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {plan.tasks.length ? (
                    plan.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        isPending={updateTaskMutation.isPending}
                        onToggle={(isCompleted) => updateTaskMutation.mutate({
                          planId: plan.id,
                          task,
                          isCompleted,
                        })}
                      />
                    ))
                  ) : (
                    <div className="rounded-[0.16rem] border border-dashed border-[#d5e1d7] bg-[#f8fbf8] px-4 py-5 text-center text-fluid-sm text-[#607965]">
                      No onboarding tasks yet.
                    </div>
                  )}
                </div>
              </section>
            ))
          ) : (
            <EmptyState title="No onboarding plans found" description="Create an employee account to start a plan." />
          )}
        </div>
      </div>

      <Modal
        open={Boolean(selectedPlan)}
        title={selectedPlan ? `Add task for ${selectedPlan.employeeName}` : 'Add task'}
        description="Add a concrete onboarding step with an owner and due date."
        onClose={() => setSelectedPlan(null)}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="inline-flex items-center justify-center rounded-[0.16rem] border border-[#b7c8bb] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#486550] transition hover:bg-[#f8fbf8]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveTask}
              disabled={addTaskMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#2f8a52] bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiPlus className="h-4 w-4" />
              {addTaskMutation.isPending ? 'Adding...' : 'Add task'}
            </button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Task title" error={fieldErrors.title}>
            <input
              type="text"
              value={taskForm.title}
              onChange={(event) => {
                setTaskForm((current) => ({ ...current, title: event.target.value }));
                setFieldErrors((current) => ({ ...current, title: '' }));
              }}
              className="admin-text-input"
            />
          </InputField>
          <InputField label="Category" error={fieldErrors.category}>
            <input
              type="text"
              value={taskForm.category}
              onChange={(event) => setTaskForm((current) => ({ ...current, category: event.target.value }))}
              className="admin-text-input"
            />
          </InputField>
          <InputField label="Owner" error={fieldErrors.owner}>
            <input
              type="text"
              value={taskForm.owner}
              onChange={(event) => setTaskForm((current) => ({ ...current, owner: event.target.value }))}
              className="admin-text-input"
            />
          </InputField>
          <InputField label="Due date" error={fieldErrors.dueDate}>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
              className="admin-text-input"
            />
          </InputField>
        </div>
      </Modal>
    </HRLayout>
  );
}

function TaskRow({
  task,
  isPending,
  onToggle,
}: {
  task: HrOnboardingTask;
  isPending: boolean;
  onToggle: (isCompleted: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[0.16rem] border border-[#d5e1d7] bg-[linear-gradient(180deg,#fbfdfb_0%,#eef6f0_100%)] px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <label className="flex min-w-0 items-start gap-3">
        <input
          type="checkbox"
          checked={task.isCompleted}
          disabled={isPending}
          onChange={(event) => onToggle(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-[#b8cbbb] text-[#2f8a52] focus:ring-[#bfe7ca]"
        />
        <span className="min-w-0">
          <span className="block text-fluid-sm font-semibold text-[#183b25]">{task.title}</span>
          <span className="mt-1 block text-fluid-xs leading-5 text-[#718f76]">
            {task.category} | {task.owner} | Due {formatDate(task.dueDate)}
          </span>
        </span>
      </label>
      {task.isCompleted ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe0d2] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#2f8a52]">
          <FiCheckCircle className="h-4 w-4" />
          Complete
        </span>
      ) : null}
    </div>
  );
}

function InputField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-fluid-sm font-semibold text-[#183b25]">{label}</label>
        {error ? <span className="text-fluid-xs font-medium text-rose-500">{error}</span> : null}
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[0.232rem] border border-dashed border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] px-6 py-10 text-center shadow-[0_14px_28px_rgba(58,88,64,0.04)]">
      <p className="text-fluid-md font-semibold text-[#183b25]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">{description}</p>
    </div>
  );
}

export default HrOnboarding;
