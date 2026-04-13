import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiEdit3, FiLayers, FiPlus, FiRefreshCcw, FiTrash2 } from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
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
  const [curriculumForm, setCurriculumForm] = useState<CurriculumFormState>(emptyCurriculumForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const fullName = getFullName(activeUser);
  const subjects = adminOverviewQuery.data?.subjects ?? [];
  const curriculums = adminOverviewQuery.data?.curriculums ?? [];
  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => ({
        value: subject.id,
        label: `${subject.title} | ${subject.code}`,
      })),
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
      resetForm();
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

  function resetForm() {
    setEditingCurriculumId(null);
    setCurriculumForm(emptyCurriculumForm());
    setFieldErrors({});
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

      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.8rem] border border-[#c9d7db] bg-[linear-gradient(135deg,rgba(251,254,254,0.97)_0%,rgba(238,245,246,0.95)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(54,79,92,0.07)] sm:px-6 sm:py-5">
          <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f8d99]">
            Curriculum planning
          </p>
          <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.05em] text-[#173b47]">
            Build each curriculum from the subject catalog.
          </h1>
          <p className="mt-2 max-w-2xl text-fluid-sm leading-6 text-[#607c88]">
            Curriculums define which subjects belong together. Sections will later inherit one
            curriculum, then assign teachers subject by subject.
          </p>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
          <section className="rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-fluid-xl font-semibold text-[#173b47]">
                  {editingCurriculumId ? 'Edit curriculum' : 'Add curriculum'}
                </p>
                <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                  Add a title, code, description, and the subjects this curriculum should contain.
                </p>
              </div>
              {editingCurriculumId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
                >
                  <FiRefreshCcw className="h-4 w-4" />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-5 space-y-4">
              <InputField label="Curriculum title" error={fieldErrors.title}>
                <input
                  type="text"
                  value={curriculumForm.title}
                  onChange={(event) => {
                    setCurriculumForm((current) => ({ ...current, title: event.target.value }));
                    setFieldErrors((current) => ({ ...current, title: '' }));
                  }}
                  placeholder="BSIT Second Year"
                  className="w-full rounded-2xl border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
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
                  className="w-full rounded-2xl border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                />
              </InputField>

              <InputField label="Description">
                <textarea
                  rows={4}
                  value={curriculumForm.description}
                  onChange={(event) => {
                    setCurriculumForm((current) => ({ ...current, description: event.target.value }));
                  }}
                  placeholder="Add any notes for this curriculum grouping."
                  className="w-full rounded-[1.2rem] border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                />
              </InputField>

              <div className="rounded-[1.35rem] border border-[#d5e0e4] bg-[linear-gradient(180deg,#f8fbfb_0%,#eef4f6_100%)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-fluid-base font-semibold text-[#173b47]">Subjects</p>
                    <p className="mt-1 text-fluid-sm text-[#607c88]">
                      Pick the subjects that should belong to this curriculum.
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
                    className="inline-flex items-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add subject
                  </button>
                </div>

                {fieldErrors.subjects ? (
                  <p className="mt-3 text-fluid-xs font-medium text-rose-500">{fieldErrors.subjects}</p>
                ) : null}

                <div className="mt-4 space-y-3">
                  {curriculumForm.subjects.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="grid gap-3 rounded-[1.1rem] border border-[#d8e3e6] bg-white px-4 py-4 xl:grid-cols-[minmax(0,1fr)_auto]"
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
                          className="inline-flex h-[3.15rem] items-center justify-center rounded-[1rem] border border-[#ecd6d6] bg-[#fff7f7] px-4 text-[#a95f5f] transition hover:bg-[#fff1f1]"
                          aria-label={`Remove subject row ${index + 1}`}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saveCurriculumMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-3 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiLayers className="h-4 w-4" />
                  {saveCurriculumMutation.isPending ? 'Saving...' : editingCurriculumId ? 'Update curriculum' : 'Create curriculum'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-4 py-3 text-fluid-base font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
                >
                  <FiRefreshCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)] xl:max-h-[calc(100vh-11.5rem)]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-fluid-xl font-semibold text-[#173b47]">Existing curriculums</p>
                  <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                    Review every curriculum and the subjects it currently includes.
                  </p>
                </div>
                <div className="rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
                  {curriculums.length} curriculums
                </div>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                {adminOverviewQuery.isLoading ? (
                  <EmptyState title="Loading curriculums..." description="The curriculum list is being prepared." />
                ) : adminOverviewQuery.isError ? (
                  <EmptyState title="Unable to load curriculums" description="Refresh the page or try again in a moment." />
                ) : curriculums.length ? (
                  <div className="scrollbar-super-thin h-full min-h-[20rem] max-h-[28rem] overflow-auto rounded-[1.45rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)] sm:max-h-[32rem] xl:max-h-[calc(100vh-18rem)]">
                    <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell className="w-[28%] rounded-tl-[1.45rem]">Curriculum</TableHeadCell>
                          <TableHeadCell className="w-[16%]">Code</TableHeadCell>
                          <TableHeadCell className="w-[30%]">Subjects</TableHeadCell>
                          <TableHeadCell className="w-[14%]">Sections</TableHeadCell>
                          <TableHeadCell className="w-[12%] rounded-tr-[1.45rem] text-right">Edit</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {curriculums.map((curriculum, index) => (
                          <tr
                            key={curriculum.id}
                            className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                          >
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,#d8ece9_0%,#c9dfdd_100%)] text-[#1d7e71]">
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
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm font-semibold text-[#4d6a77]">
                              {curriculum.code}
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {curriculum.subjects.map((subject) => (
                                  <span
                                    key={`${curriculum.id}-${subject.subjectId}`}
                                    className="rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]"
                                  >
                                    {subject.subjectCode}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                {curriculum.linkedSectionCount}
                              </span>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-right">
                              <button
                                type="button"
                                onClick={() => startEditing(curriculum)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
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
                  <EmptyState title="No curriculums yet" description="Create your first curriculum using the form on the left." />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
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
    <div className="rounded-[1.35rem] border border-dashed border-[#d4e0e4] bg-[linear-gradient(180deg,#fbfdfd_0%,#eef4f6_100%)] px-6 py-10 text-center">
      <p className="text-fluid-md font-semibold text-[#173b47]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">{description}</p>
    </div>
  );
}

export default AdminCurriculums;
