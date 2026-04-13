import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiBookOpen, FiEdit3, FiPlus, FiRefreshCcw } from 'react-icons/fi';
import NotificationPopup from '../../components/NotificationPopup';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import AdminLayout from '../../layout/admin/AdminLayout';
import { getStoredToken } from '../../lib/auth';

type AdminSubject = {
  id: string;
  title: string;
  code: string;
  slug: string;
  iconKey: string;
  description: string;
  curriculumCount: number;
  teacherCount: number;
};

type AdminOverviewResponse = {
  subjects: AdminSubject[];
};

type SubjectFormState = {
  title: string;
  code: string;
  description: string;
  iconKey: string;
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

function emptySubjectForm(): SubjectFormState {
  return {
    title: '',
    code: '',
    description: '',
    iconKey: 'book',
  };
}

function AdminSubjects() {
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<SubjectFormState>(emptySubjectForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const adminOverviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const response = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load subject catalog');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError),
  });

  const fullName = useMemo(
    () =>
      [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName]
        .filter(Boolean)
        .join(' '),
    [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName],
  );
  const subjects = adminOverviewQuery.data?.subjects ?? [];

  const saveSubjectMutation = useMutation({
    mutationFn: async (payload: SubjectFormState) => {
      const endpoint = editingSubjectId
        ? `/api/admin/subjects/${editingSubjectId}`
        : '/api/admin/subjects';
      const response = await fetch(endpoint, {
        method: editingSubjectId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save subject') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        message: data.message ?? 'Subject saved successfully',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      setNotification({
        open: true,
        title: editingSubjectId ? 'Subject updated' : 'Subject created',
        message: result.message,
        variant: 'success',
      });
      resetForm();
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save subject',
        message: error.message || 'Please review the subject details and try again.',
        variant: 'error',
      });
    },
  });

  function resetForm() {
    setEditingSubjectId(null);
    setSubjectForm(emptySubjectForm());
    setFieldErrors({});
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};

    if (!subjectForm.title.trim()) {
      nextErrors.title = 'Subject name is required';
    }

    if (!subjectForm.code.trim()) {
      nextErrors.code = 'Subject code is required';
    }

    if (!subjectForm.description.trim()) {
      nextErrors.description = 'Description is required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    saveSubjectMutation.mutate({
      title: subjectForm.title.trim(),
      code: subjectForm.code.trim(),
      description: subjectForm.description.trim(),
      iconKey: subjectForm.iconKey,
    });
  }

  function startEditing(subject: AdminSubject) {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      title: subject.title,
      code: subject.code,
      description: subject.description,
      iconKey: subject.iconKey || 'book',
    });
    setFieldErrors({});
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
      pageTitle="Subjects"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.7rem] border border-[#c9d7db] bg-[linear-gradient(135deg,rgba(251,254,254,0.97)_0%,rgba(238,245,246,0.95)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(54,79,92,0.07)] sm:px-6 sm:py-5">
          <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f8d99]">
            Subject catalog
          </p>
          <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.05em] text-[#173b47]">
            Add and maintain the subjects available to your curriculums.
          </h1>
          <p className="mt-2 max-w-2xl text-fluid-sm leading-6 text-[#607c88]">
            Use the form to create subjects with the exact details you need, then attach them to
            curriculums from the admin dashboard.
          </p>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-[400px_minmax(0,1fr)] xl:items-start">
          <section className="rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-fluid-xl font-semibold text-[#173b47]">
                  {editingSubjectId ? 'Edit subject' : 'Add subject'}
                </p>
                <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                  Fill in the subject name, subject code, and description.
                </p>
              </div>
              {editingSubjectId ? (
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
              <InputField label="Subject name" error={fieldErrors.title}>
                <input
                  type="text"
                  value={subjectForm.title}
                  onChange={(event) => {
                    setSubjectForm((current) => ({ ...current, title: event.target.value }));
                    setFieldErrors((current) => ({ ...current, title: '' }));
                  }}
                  placeholder="Programming Fundamentals"
                  className="w-full rounded-2xl border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                />
              </InputField>

              <InputField label="Subject code" error={fieldErrors.code}>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(event) => {
                    setSubjectForm((current) => ({ ...current, code: event.target.value }));
                    setFieldErrors((current) => ({ ...current, code: '' }));
                  }}
                  placeholder="IT-PR 210"
                  className="w-full rounded-2xl border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                />
              </InputField>

              <InputField label="Description" error={fieldErrors.description}>
                <textarea
                  rows={5}
                  value={subjectForm.description}
                  onChange={(event) => {
                    setSubjectForm((current) => ({ ...current, description: event.target.value }));
                    setFieldErrors((current) => ({ ...current, description: '' }));
                  }}
                  placeholder="Describe what the subject covers."
                  className="w-full rounded-[1.2rem] border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                />
              </InputField>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saveSubjectMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-3 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiPlus className="h-4 w-4" />
                  {saveSubjectMutation.isPending ? 'Saving...' : editingSubjectId ? 'Update subject' : 'Create subject'}
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
                  <p className="text-fluid-xl font-semibold text-[#173b47]">Existing subjects</p>
                  <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                    Review the current catalog and choose any subject to edit.
                  </p>
                </div>
                <div className="rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
                  {subjects.length} subjects
                </div>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                {adminOverviewQuery.isLoading ? (
                  <EmptyState title="Loading subjects..." description="The subject catalog is being prepared." />
                ) : adminOverviewQuery.isError ? (
                  <EmptyState title="Unable to load subjects" description="Refresh the page or try again in a moment." />
                ) : subjects.length ? (
                  <div className="scrollbar-super-thin h-full min-h-[20rem] max-h-[28rem] overflow-auto rounded-[1.45rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)] sm:max-h-[32rem] xl:max-h-[calc(100vh-18rem)]">
                    <table className="min-w-[760px] w-full table-fixed border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell className="w-[28%] rounded-tl-[1.45rem]">Subject</TableHeadCell>
                          <TableHeadCell className="w-[14%]">Code</TableHeadCell>
                          <TableHeadCell className="w-[30%]">Description</TableHeadCell>
                          <TableHeadCell className="w-[12%]">Curriculums</TableHeadCell>
                          <TableHeadCell className="w-[10%]">Teachers</TableHeadCell>
                          <TableHeadCell className="w-[6%] rounded-tr-[1.45rem] text-right">Edit</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((subject, index) => (
                          <tr
                            key={subject.id}
                            className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                          >
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(180deg,#d8ece9_0%,#c9dfdd_100%)] text-[#1d7e71]">
                                  <FiBookOpen className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                                    {subject.title}
                                  </p>
                                  <p className="mt-1 text-fluid-xs uppercase tracking-[0.18em] text-[#7b95a1]">
                                    {subject.slug}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm font-semibold text-[#4d6a77]">
                              {subject.code}
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <p className="formatted-text line-clamp-3 text-fluid-sm leading-6 text-[#607c88]">
                                {subject.description}
                              </p>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                {subject.curriculumCount}
                              </span>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                {subject.teacherCount}
                              </span>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-right">
                              <button
                                type="button"
                                onClick={() => startEditing(subject)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                                aria-label={`Edit ${subject.title}`}
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
                  <EmptyState title="No subjects yet" description="Create your first subject using the form on the left." />
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
    <div className="rounded-[1.4rem] border border-dashed border-[#d4e0e4] bg-[linear-gradient(180deg,#fbfdfd_0%,#eef4f6_100%)] px-6 py-10 text-center">
      <p className="text-fluid-md font-semibold text-[#173b47]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">{description}</p>
    </div>
  );
}

export default AdminSubjects;
