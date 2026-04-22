import { type Dispatch, type ReactNode, type SetStateAction, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiEdit3, FiLayers, FiPlus, FiTrash2 } from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import AdminLayout from '../../layout/admin/AdminLayout';
import { getFullName, type AdminCurriculum, type AdminOverviewResponse, useAdminOverview } from './adminData';

type CurriculumSubjectDraft = {
  id: string;
  subjectId: string;
};

type CurriculumFormState = {
  title: string;
  code: string;
  description: string;
  subjects: CurriculumSubjectDraft[];
};

type NotificationState = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
};

type MutationError = Error & {
  fieldErrors?: Record<string, string>;
};

function createSubjectDraft(subjectId = ''): CurriculumSubjectDraft {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    subjectId,
  };
}

function emptyCurriculumForm(): CurriculumFormState {
  return {
    title: '',
    code: '',
    description: '',
    subjects: [createSubjectDraft()],
  };
}

function AdminCurriculums() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, adminOverviewQuery } = useAdminOverview();
  const [editingCurriculumId, setEditingCurriculumId] = useState<string | null>(null);
  const [isCurriculumModalOpen, setIsCurriculumModalOpen] = useState(false);
  const [curriculumForm, setCurriculumForm] = useState<CurriculumFormState>(emptyCurriculumForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const fullName = getFullName(activeUser);
  const subjects = adminOverviewQuery.data?.subjects;
  const curriculums = adminOverviewQuery.data?.curriculums ?? [];
  const subjectOptions = useMemo(
    () => {
      const availableSubjects = subjects ?? [];

      return availableSubjects.map((subject) => ({
        value: subject.id,
        label: `${subject.title} | ${subject.code}`,
      }));
    },
    [subjects],
  );

  const saveCurriculumMutation = useMutation({
    mutationFn: async (payload: CurriculumFormState) => {
      const endpoint = editingCurriculumId
        ? `/api/admin/curriculums/${editingCurriculumId}`
        : '/api/admin/curriculums';
      const response = await fetch(endpoint, {
        method: editingCurriculumId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: payload.title,
          code: payload.code,
          description: payload.description,
          subjects: payload.subjects.map((entry) => ({
            subjectId: entry.subjectId,
          })),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save curriculum') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        message: data.message ?? 'Curriculum saved successfully',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      setNotification({
        open: true,
        title: editingCurriculumId ? 'Curriculum updated' : 'Curriculum created',
        message: result.message,
        variant: 'success',
      });
      resetModal();
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save curriculum',
        message: error.message || 'Please review the curriculum details and try again.',
        variant: 'error',
      });
    },
  });

  function resetModal() {
    setIsCurriculumModalOpen(false);
    setEditingCurriculumId(null);
    setCurriculumForm(emptyCurriculumForm());
    setFieldErrors({});
  }

  function openCreateModal() {
    setEditingCurriculumId(null);
    setCurriculumForm(emptyCurriculumForm());
    setFieldErrors({});
    setIsCurriculumModalOpen(true);
  }

  function startEditing(curriculum: AdminCurriculum) {
    setEditingCurriculumId(curriculum.id);
    setCurriculumForm({
      title: curriculum.title,
      code: curriculum.code,
      description: curriculum.description,
      subjects: curriculum.subjects.length
        ? curriculum.subjects.map((subject) => createSubjectDraft(subject.subjectId))
        : [createSubjectDraft()],
    });
    setFieldErrors({});
    setIsCurriculumModalOpen(true);
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    const normalizedSubjectIds = curriculumForm.subjects
      .map((entry) => entry.subjectId)
      .filter(Boolean);

    if (!curriculumForm.title.trim()) {
      nextErrors.title = 'Curriculum title is required';
    }

    if (!curriculumForm.code.trim()) {
      nextErrors.code = 'Curriculum code is required';
    }

    if (normalizedSubjectIds.length === 0) {
      nextErrors.subjects = 'Add at least one subject';
    } else if (normalizedSubjectIds.length !== curriculumForm.subjects.length) {
      nextErrors.subjects = 'Every row must have a subject';
    } else if (new Set(normalizedSubjectIds).size !== normalizedSubjectIds.length) {
      nextErrors.subjects = 'Each subject can only appear once';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    saveCurriculumMutation.mutate({
      title: curriculumForm.title.trim(),
      code: curriculumForm.code.trim(),
      description: curriculumForm.description.trim(),
      subjects: curriculumForm.subjects,
    });
  }

  if (!activeUser || isError) {
    return null;
  }

  return (
    <AdminLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section || 'Administration'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Admin workspace"
      pageTitle="Curriculums"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <Modal
        open={isCurriculumModalOpen}
        title={editingCurriculumId ? 'Edit curriculum' : 'Add curriculum'}
        description="Set the curriculum code, description, and subject list."
        onClose={resetModal}
        panelClassName="max-w-5xl"
        bodyClassName="scrollbar-super-thin max-h-[70vh] overflow-auto px-5 py-5 sm:px-6"
        actions={(
          <>
            <button
              type="button"
              onClick={resetModal}
              className="inline-flex items-center justify-center rounded-[0.16rem] border border-[#b7c7d6] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#48617d] transition hover:bg-[#f8fbfb]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saveCurriculumMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingCurriculumId ? <FiEdit3 className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
              {saveCurriculumMutation.isPending ? 'Saving...' : editingCurriculumId ? 'Save changes' : 'Create curriculum'}
            </button>
          </>
        )}
      >
        <CurriculumFormFields
          curriculumForm={curriculumForm}
          fieldErrors={fieldErrors}
          subjectOptions={subjectOptions}
          setCurriculumForm={setCurriculumForm}
          setFieldErrors={setFieldErrors}
        />
      </Modal>

      <div className="mx-auto flex min-h-[calc(100dvh-0.88rem)] w-full max-w-none flex-col px-4 py-5 sm:px-6 lg:min-h-[calc(100dvh-1.04rem)] lg:px-8">
        <div className="flex min-h-0 flex-1">
          <section className="flex min-h-0 flex-1 overflow-hidden rounded-[0.272rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-4 shadow-[0_14px_28px_rgba(54,79,92,0.06)] sm:p-5">
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-fluid-xl font-semibold text-[#173b47]">Existing curriculums</p>
                  <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                    Review every curriculum and open one to edit its subject list.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
                    {curriculums.length} curriculums
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.16rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add curriculum
                  </button>
                </div>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                {adminOverviewQuery.isLoading ? (
                  <EmptyState title="Loading curriculums..." description="The curriculum list is being prepared." />
                ) : adminOverviewQuery.isError ? (
                  <EmptyState title="Unable to load curriculums" description="Refresh the page or try again in a moment." />
                ) : curriculums.length ? (
                  <div className="scrollbar-super-thin h-full min-h-[3.2rem] overflow-auto rounded-[0.232rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)]">
                    <table className="w-full min-w-[860px] table-fixed border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell className="w-[28%] rounded-tl-[0.232rem]">Curriculum</TableHeadCell>
                          <TableHeadCell className="w-[14%]">Code</TableHeadCell>
                          <TableHeadCell className="w-[34%]">Subjects</TableHeadCell>
                          <TableHeadCell className="w-[14%]">Sections</TableHeadCell>
                          <TableHeadCell className="sticky right-0 w-[10%] rounded-tr-[0.232rem] text-center shadow-[-10px_0_18px_rgba(82,112,125,0.08)]">Edit</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {curriculums.map((curriculum, index) => (
                          <tr
                            key={curriculum.id}
                            className={`group transition-colors ${index % 2 === 0 ? 'bg-white/70 hover:bg-[#f3faf9]' : 'bg-[#f7fbfc]/92 hover:bg-[#f0f7f8]'}`}
                          >
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.16rem] bg-[linear-gradient(180deg,#d8ece9_0%,#c9dfdd_100%)] text-[#1d7e71]">
                                  <FiLayers className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                                    {curriculum.title}
                                  </p>
                                  <p className="formatted-text mt-1 line-clamp-2 text-fluid-sm leading-6 text-[#607c88]">
                                    {curriculum.description || 'No description added yet.'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                {curriculum.code}
                              </span>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {curriculum.subjects.length ? (
                                  curriculum.subjects.map((subject) => (
                                    <span
                                      key={`${curriculum.id}-${subject.subjectId}`}
                                      className="rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]"
                                    >
                                      {subject.subjectCode}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-fluid-sm text-[#7b95a1]">No subjects</span>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                {curriculum.linkedSectionCount} sections
                              </span>
                            </td>
                            <td className="sticky right-0 z-[1] border-b border-[#dce6e9] bg-[#fbfefe] px-3 py-4 align-top text-center shadow-[-10px_0_18px_rgba(82,112,125,0.08)] transition-colors group-hover:bg-[#f2faf8]">
                              <button
                                type="button"
                                onClick={() => startEditing(curriculum)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.152rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                                aria-label={`Edit ${curriculum.title}`}
                              >
                                <FiEdit3 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No curriculums yet" description="Use the Add curriculum button to create the first curriculum." />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function CurriculumFormFields({
  curriculumForm,
  fieldErrors,
  subjectOptions,
  setCurriculumForm,
  setFieldErrors,
}: {
  curriculumForm: CurriculumFormState;
  fieldErrors: Record<string, string>;
  subjectOptions: Array<{ label: string; value: string }>;
  setCurriculumForm: Dispatch<SetStateAction<CurriculumFormState>>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InputField label="Curriculum title" error={fieldErrors.title}>
        <input
          type="text"
          value={curriculumForm.title}
          onChange={(event) => {
            setCurriculumForm((current) => ({ ...current, title: event.target.value }));
            setFieldErrors((current) => ({ ...current, title: '' }));
          }}
          placeholder="BSIT Second Year"
          className="admin-text-input"
        />
      </InputField>

      <InputField label="Curriculum code" error={fieldErrors.code}>
        <input
          type="text"
          value={curriculumForm.code}
          onChange={(event) => {
            setCurriculumForm((current) => ({ ...current, code: event.target.value }));
            setFieldErrors((current) => ({ ...current, code: '' }));
          }}
          placeholder="BSIT-2"
          className="admin-text-input"
        />
      </InputField>

      <div className="lg:col-span-2">
        <InputField label="Description">
          <textarea
            rows={4}
            value={curriculumForm.description}
            onChange={(event) => {
              setCurriculumForm((current) => ({ ...current, description: event.target.value }));
            }}
            placeholder="Add any notes for this curriculum grouping."
            className="admin-text-input rounded-[0.16rem]"
          />
        </InputField>
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-[0.192rem] border border-[#d5e0e4] bg-[linear-gradient(180deg,#f8fbfb_0%,#eef4f6_100%)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-fluid-base font-semibold text-[#173b47]">Subjects</p>
              <p className="mt-1 text-fluid-sm leading-6 text-[#607c88]">
                Pick the subjects that belong to this curriculum.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCurriculumForm((current) => ({
                  ...current,
                  subjects: [...current.subjects, createSubjectDraft()],
                }));
                setFieldErrors((current) => ({ ...current, subjects: '' }));
              }}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.16rem] border border-[#d1dde1] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
            >
              <FiPlus className="h-4 w-4" />
              Add subject
            </button>
          </div>

          {fieldErrors.subjects ? (
            <p className="mt-3 text-fluid-xs font-medium text-rose-500">{fieldErrors.subjects}</p>
          ) : null}

          <div className="mt-4 grid gap-3">
            {curriculumForm.subjects.map((entry, index) => (
              <div
                key={entry.id}
                className="grid gap-3 rounded-[0.16rem] border border-[#d8e3e6] bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <InputField label={`Subject ${index + 1}`}>
                  <CustomSelect
                    id={`curriculum-subject-${entry.id}`}
                    value={entry.subjectId}
                    onChange={(value) => {
                      setCurriculumForm((current) => ({
                        ...current,
                        subjects: current.subjects.map((item) => (
                          item.id === entry.id
                            ? { ...item, subjectId: value }
                            : item
                        )),
                      }));
                      setFieldErrors((current) => ({ ...current, subjects: '' }));
                    }}
                    options={subjectOptions}
                    placeholder={subjectOptions.length ? 'Choose subject' : 'Create a subject first'}
                    menuPosition="top"
                    tone="muted"
                  />
                </InputField>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCurriculumForm((current) => ({
                        ...current,
                        subjects: current.subjects.length > 1
                          ? current.subjects.filter((item) => item.id !== entry.id)
                          : [createSubjectDraft()],
                      }));
                    }}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[0.16rem] border border-[#ecd6d6] bg-[#fff7f7] text-[#a95f5f] transition hover:bg-[#fff1f1]"
                    aria-label={`Remove subject row ${index + 1}`}
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
        <label className="block text-fluid-sm font-semibold text-[#173b47]">{label}</label>
        {error ? <span className="text-fluid-xs font-medium text-rose-500">{error}</span> : null}
      </div>
      {children}
    </div>
  );
}

function TableHeadCell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-[#d7e2e6] bg-[linear-gradient(180deg,#eef5f7_0%,#e6eef1_100%)] px-4 py-3 text-left text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6e8894] ${className}`}
    >
      {children}
    </th>
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
    <div className="rounded-[0.224rem] border border-dashed border-[#d4e0e4] bg-[linear-gradient(180deg,#fbfdfd_0%,#eef4f6_100%)] px-6 py-10 text-center">
      <p className="text-fluid-md font-semibold text-[#173b47]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">{description}</p>
    </div>
  );
}

export default AdminCurriculums;
