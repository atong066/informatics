import { type Dispatch, type ReactNode, type SetStateAction, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiBookOpen, FiEdit3, FiPlus } from 'react-icons/fi';
import CustomMultiSelect from '../../components/CustomMultiSelect';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
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
  yearLevel: string;
  semester: string;
  units: {
    lec: number;
    lab: number;
  };
  hours: {
    lec: number;
    lab: number;
  };
  prerequisiteSubjectIds: string[];
  prerequisites: Array<{
    subjectId: string;
    subjectTitle: string;
    subjectCode: string;
  }>;
  resultantQualification: string;
  jobRoles: string[];
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
  yearLevel: string;
  semester: string;
  unitsLec: string;
  unitsLab: string;
  hoursLec: string;
  hoursLab: string;
  prerequisiteSubjectIds: string[];
  resultantQualification: string;
  jobRolesText: string;
};

type SubjectPayload = {
  title: string;
  code: string;
  description: string;
  iconKey: string;
  yearLevel: string;
  semester: string;
  units: {
    lec: number;
    lab: number;
  };
  hours: {
    lec: number;
    lab: number;
  };
  prerequisiteSubjectIds: string[];
  resultantQualification: string;
  jobRoles: string[];
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

const yearLevelOptions = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
const semesterOptions = ['First Semester', 'Second Semester', 'Summer'];

function emptySubjectForm(): SubjectFormState {
  return {
    title: '',
    code: '',
    description: '',
    iconKey: 'book',
    yearLevel: 'First Year',
    semester: 'First Semester',
    unitsLec: '0',
    unitsLab: '0',
    hoursLec: '0',
    hoursLab: '0',
    prerequisiteSubjectIds: [],
    resultantQualification: '',
    jobRolesText: '',
  };
}

function parseNonNegativeNumber(value: string) {
  const parsedValue = Number(value.trim() || '0');

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function parseJobRoles(value: string) {
  return Array.from(new Set(
    value
      .split(/\r?\n|,/)
      .map((role) => role.trim())
      .filter(Boolean),
  ));
}

function AdminSubjects() {
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
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
  const subjects = adminOverviewQuery.data?.subjects;
  const subjectRows = subjects ?? [];
  const prerequisiteOptions = useMemo(
    () => {
      const availableSubjects = subjects ?? [];

      return availableSubjects
        .filter((subject) => subject.id !== editingSubjectId)
        .map((subject) => ({
          value: subject.id,
          label: `${subject.title} | ${subject.code}`,
        }));
    },
    [editingSubjectId, subjects],
  );

  const saveSubjectMutation = useMutation({
    mutationFn: async (payload: SubjectPayload) => {
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
      resetModal();
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

  function resetModal() {
    setIsSubjectModalOpen(false);
    setEditingSubjectId(null);
    setSubjectForm(emptySubjectForm());
    setFieldErrors({});
  }

  function openCreateModal() {
    setEditingSubjectId(null);
    setSubjectForm(emptySubjectForm());
    setFieldErrors({});
    setIsSubjectModalOpen(true);
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    const unitsLec = parseNonNegativeNumber(subjectForm.unitsLec);
    const unitsLab = parseNonNegativeNumber(subjectForm.unitsLab);
    const hoursLec = parseNonNegativeNumber(subjectForm.hoursLec);
    const hoursLab = parseNonNegativeNumber(subjectForm.hoursLab);

    if (!subjectForm.title.trim()) {
      nextErrors.title = 'Subject name is required';
    }

    if (!subjectForm.code.trim()) {
      nextErrors.code = 'Subject code is required';
    }

    if (!subjectForm.description.trim()) {
      nextErrors.description = 'Description is required';
    }

    if (unitsLec === null) {
      nextErrors.unitsLec = 'Use 0 or more';
    }

    if (unitsLab === null) {
      nextErrors.unitsLab = 'Use 0 or more';
    }

    if (hoursLec === null) {
      nextErrors.hoursLec = 'Use 0 or more';
    }

    if (hoursLab === null) {
      nextErrors.hoursLab = 'Use 0 or more';
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
      yearLevel: subjectForm.yearLevel.trim() || 'First Year',
      semester: subjectForm.semester.trim() || 'First Semester',
      units: {
        lec: unitsLec ?? 0,
        lab: unitsLab ?? 0,
      },
      hours: {
        lec: hoursLec ?? 0,
        lab: hoursLab ?? 0,
      },
      prerequisiteSubjectIds: subjectForm.prerequisiteSubjectIds,
      resultantQualification: subjectForm.resultantQualification.trim(),
      jobRoles: parseJobRoles(subjectForm.jobRolesText),
    });
  }

  function startEditing(subject: AdminSubject) {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      title: subject.title,
      code: subject.code,
      description: subject.description,
      iconKey: subject.iconKey || 'book',
      yearLevel: subject.yearLevel || 'First Year',
      semester: subject.semester || 'First Semester',
      unitsLec: String(subject.units?.lec ?? 0),
      unitsLab: String(subject.units?.lab ?? 0),
      hoursLec: String(subject.hours?.lec ?? 0),
      hoursLab: String(subject.hours?.lab ?? 0),
      prerequisiteSubjectIds: subject.prerequisiteSubjectIds ?? [],
      resultantQualification: subject.resultantQualification ?? '',
      jobRolesText: (subject.jobRoles ?? []).join('\n'),
    });
    setFieldErrors({});
    setIsSubjectModalOpen(true);
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

      <Modal
        open={isSubjectModalOpen}
        title={editingSubjectId ? 'Edit subject' : 'Add subject'}
        description="Capture the subject code, lecture and lab load, prerequisites, qualification, and related job roles."
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
              disabled={saveSubjectMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editingSubjectId ? <FiEdit3 className="h-4 w-4" /> : <FiPlus className="h-4 w-4" />}
              {saveSubjectMutation.isPending ? 'Saving...' : editingSubjectId ? 'Save changes' : 'Create subject'}
            </button>
          </>
        )}
      >
        <SubjectFormFields
          subjectForm={subjectForm}
          fieldErrors={fieldErrors}
          prerequisiteOptions={prerequisiteOptions}
          setSubjectForm={setSubjectForm}
          setFieldErrors={setFieldErrors}
        />
      </Modal>

      <div className="mx-auto flex min-h-[calc(100dvh-0.88rem)] w-full max-w-none flex-col px-4 py-5 sm:px-6 lg:min-h-[calc(100dvh-1.04rem)] lg:px-8">
        <div className="flex min-h-0 flex-1">
          <section className="flex min-h-0 flex-1 overflow-hidden rounded-[0.272rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-4 shadow-[0_14px_28px_rgba(54,79,92,0.06)] sm:p-5">
            <div className="flex h-full min-h-0 w-full flex-col">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-fluid-xl font-semibold text-[#173b47]">Existing subjects</p>
                  <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                    Review the subject catalog as a data table and open a subject to edit.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d] whitespace-nowrap">
                    {subjectRows.length} subjects
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.16rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add subject
                  </button>
                </div>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                {adminOverviewQuery.isLoading ? (
                  <EmptyState title="Loading subjects..." description="The subject catalog is being prepared." />
                ) : adminOverviewQuery.isError ? (
                  <EmptyState title="Unable to load subjects" description="Refresh the page or try again in a moment." />
                ) : subjectRows.length ? (
                  <div className="scrollbar-super-thin h-full min-h-[3.2rem] overflow-auto rounded-[0.232rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)]">
                    <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell className="w-[22%] rounded-tl-[0.232rem]">Subject</TableHeadCell>
                          <TableHeadCell className="w-[11%]">Year / Sem</TableHeadCell>
                          <TableHeadCell className="w-[9%]">Units</TableHeadCell>
                          <TableHeadCell className="w-[9%]">Hours</TableHeadCell>
                          <TableHeadCell className="w-[11%]">Pre-Req</TableHeadCell>
                          <TableHeadCell className="w-[22%]">Qualification / Roles</TableHeadCell>
                          <TableHeadCell className="w-[10%]">Usage</TableHeadCell>
                          <TableHeadCell className="sticky right-0 w-[6%] rounded-tr-[0.232rem] text-center shadow-[-10px_0_18px_rgba(82,112,125,0.08)]">Edit</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectRows.map((subject, index) => (
                          <tr
                            key={subject.id}
                            className={`group transition-colors ${index % 2 === 0 ? 'bg-white/70 hover:bg-[#f3faf9]' : 'bg-[#f7fbfc]/92 hover:bg-[#f0f7f8]'}`}
                          >
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.16rem] bg-[linear-gradient(180deg,#d8ece9_0%,#c9dfdd_100%)] text-[#1d7e71]">
                                  <FiBookOpen className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                                    {subject.title}
                                  </p>
                                  <p className="mt-1 text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#7b95a1]">
                                    {subject.code}
                                  </p>
                                  <p className="formatted-text mt-2 line-clamp-2 text-fluid-xs leading-5 text-[#607c88]">
                                    {subject.description}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm font-semibold text-[#4d6a77]">
                              <span className="block text-[#173b47]">{subject.yearLevel || 'First Year'}</span>
                              <span className="mt-1 block text-fluid-xs uppercase tracking-[0.16em] text-[#7b95a1]">
                                {subject.semester || 'First Semester'}
                              </span>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="space-y-2 text-fluid-xs font-semibold text-[#5a7885]">
                                <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1">
                                  LEC {subject.units?.lec ?? 0}
                                </span>
                                <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1">
                                  LAB {subject.units?.lab ?? 0}
                                </span>
                                <span className="block text-[#7b95a1]">
                                  Total {(subject.units?.lec ?? 0) + (subject.units?.lab ?? 0)}
                                </span>
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="space-y-2 text-fluid-xs font-semibold text-[#5a7885]">
                                <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1">
                                  LEC {subject.hours?.lec ?? 0}
                                </span>
                                <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1">
                                  LAB {subject.hours?.lab ?? 0}
                                </span>
                                <span className="block text-[#7b95a1]">
                                  Total {(subject.hours?.lec ?? 0) + (subject.hours?.lab ?? 0)}
                                </span>
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="flex flex-wrap gap-2">
                                {subject.prerequisites.length ? (
                                  subject.prerequisites.map((prerequisite) => (
                                    <span
                                      key={`${subject.id}-${prerequisite.subjectId}`}
                                      className="rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]"
                                    >
                                      {prerequisite.subjectCode}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-fluid-sm text-[#7b95a1]">None</span>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              {subject.resultantQualification ? (
                                <p className="text-fluid-sm font-semibold text-[#173b47]">
                                  {subject.resultantQualification}
                                </p>
                              ) : (
                                <p className="text-fluid-sm text-[#7b95a1]">No qualification</p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                {subject.jobRoles.length ? (
                                  subject.jobRoles.map((role) => (
                                    <span
                                      key={`${subject.id}-${role}`}
                                      className="rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]"
                                    >
                                      {role}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-fluid-xs font-semibold uppercase tracking-[0.16em] text-[#8aa0aa]">
                                    No roles
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <div className="space-y-2 text-fluid-xs font-semibold text-[#5a7885]">
                                <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1">
                                  {subject.curriculumCount} curr.
                                </span>
                                <span className="inline-flex whitespace-nowrap rounded-full border border-[#d1dde1] bg-white px-3 py-1">
                                  {subject.teacherCount} teachers
                                </span>
                              </div>
                            </td>
                            <td className="sticky right-0 z-[1] border-b border-[#dce6e9] bg-[#fbfefe] px-3 py-4 align-top text-center shadow-[-10px_0_18px_rgba(82,112,125,0.08)] transition-colors group-hover:bg-[#f2faf8]">
                              <button
                                type="button"
                                onClick={() => startEditing(subject)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.152rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
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
                  <EmptyState title="No subjects yet" description="Use the Add subject button to create the first catalog entry." />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function SubjectFormFields({
  subjectForm,
  fieldErrors,
  prerequisiteOptions,
  setSubjectForm,
  setFieldErrors,
}: {
  subjectForm: SubjectFormState;
  fieldErrors: Record<string, string>;
  prerequisiteOptions: Array<{ label: string; value: string }>;
  setSubjectForm: Dispatch<SetStateAction<SubjectFormState>>;
  setFieldErrors: Dispatch<SetStateAction<Record<string, string>>>;
}) {
  return (
    <div className="space-y-4">
      <FormSection
        eyebrow="Catalog"
        title="Subject identity"
        description="Name, code, and academic placement."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.72fr)_minmax(0,0.68fr)_minmax(0,0.68fr)]">
          <InputField label="Subject name" error={fieldErrors.title}>
            <input
              type="text"
              value={subjectForm.title}
              onChange={(event) => {
                setSubjectForm((current) => ({ ...current, title: event.target.value }));
                setFieldErrors((current) => ({ ...current, title: '' }));
              }}
              placeholder="Programming Fundamentals"
              className="admin-text-input"
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
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Year level" error={fieldErrors.yearLevel}>
            <CustomSelect
              id="subject-year-level"
              value={subjectForm.yearLevel}
              onChange={(value) => {
                setSubjectForm((current) => ({ ...current, yearLevel: value }));
                setFieldErrors((current) => ({ ...current, yearLevel: '' }));
              }}
              options={yearLevelOptions}
              placeholder="Choose year"
              tone="muted"
            />
          </InputField>

          <InputField label="Semester" error={fieldErrors.semester}>
            <CustomSelect
              id="subject-semester"
              value={subjectForm.semester}
              onChange={(value) => {
                setSubjectForm((current) => ({ ...current, semester: value }));
                setFieldErrors((current) => ({ ...current, semester: '' }));
              }}
              options={semesterOptions}
              placeholder="Choose semester"
              tone="muted"
            />
          </InputField>
        </div>
      </FormSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <FormSection
          eyebrow="Load"
          title="Units and hours"
          description="Lecture and laboratory values."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField label="Units LEC" error={fieldErrors.unitsLec}>
              <input
                type="number"
                min="0"
                step="0.5"
                value={subjectForm.unitsLec}
                onChange={(event) => {
                  setSubjectForm((current) => ({ ...current, unitsLec: event.target.value }));
                  setFieldErrors((current) => ({ ...current, unitsLec: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Units LAB" error={fieldErrors.unitsLab}>
              <input
                type="number"
                min="0"
                step="0.5"
                value={subjectForm.unitsLab}
                onChange={(event) => {
                  setSubjectForm((current) => ({ ...current, unitsLab: event.target.value }));
                  setFieldErrors((current) => ({ ...current, unitsLab: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Hours LEC" error={fieldErrors.hoursLec}>
              <input
                type="number"
                min="0"
                step="0.5"
                value={subjectForm.hoursLec}
                onChange={(event) => {
                  setSubjectForm((current) => ({ ...current, hoursLec: event.target.value }));
                  setFieldErrors((current) => ({ ...current, hoursLec: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Hours LAB" error={fieldErrors.hoursLab}>
              <input
                type="number"
                min="0"
                step="0.5"
                value={subjectForm.hoursLab}
                onChange={(event) => {
                  setSubjectForm((current) => ({ ...current, hoursLab: event.target.value }));
                  setFieldErrors((current) => ({ ...current, hoursLab: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>
          </div>
        </FormSection>

        <FormSection
          eyebrow="Description"
          title="Subject coverage"
          description="Short notes for catalog and curriculum views."
        >
          <InputField label="Description" error={fieldErrors.description}>
            <textarea
              rows={5}
              value={subjectForm.description}
              onChange={(event) => {
                setSubjectForm((current) => ({ ...current, description: event.target.value }));
                setFieldErrors((current) => ({ ...current, description: '' }));
              }}
              placeholder="Describe what the subject covers."
              className="admin-text-input min-h-[1.52rem] resize-y rounded-[0.16rem]"
            />
          </InputField>
        </FormSection>
      </div>

      <FormSection
        eyebrow="Outcomes"
        title="Prerequisites and career mapping"
        description="Connect the subject to required prior learning and job roles."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <InputField label="Prerequisites" error={fieldErrors.prerequisiteSubjectIds}>
              <CustomMultiSelect
                id="subject-prerequisites"
                options={prerequisiteOptions}
                placeholder={prerequisiteOptions.length ? 'Choose prerequisites' : 'Add another subject first'}
                values={subjectForm.prerequisiteSubjectIds}
                onChange={(values) => {
                  setSubjectForm((current) => ({ ...current, prerequisiteSubjectIds: values }));
                  setFieldErrors((current) => ({ ...current, prerequisiteSubjectIds: '' }));
                }}
                menuPosition="top"
                selectionLabel="prerequisites"
                emptyMessage="No other subjects available yet"
                tone="muted"
              />
            </InputField>

            <InputField label="Resultant qualification" error={fieldErrors.resultantQualification}>
              <input
                type="text"
                value={subjectForm.resultantQualification}
                onChange={(event) => {
                  setSubjectForm((current) => ({ ...current, resultantQualification: event.target.value }));
                  setFieldErrors((current) => ({ ...current, resultantQualification: '' }));
                }}
                placeholder="Illustration NCII"
                className="admin-text-input"
              />
            </InputField>
          </div>

          <InputField label="Job Titles / Job Roles" error={fieldErrors.jobRoles}>
            <textarea
              rows={5}
              value={subjectForm.jobRolesText}
              onChange={(event) => {
                setSubjectForm((current) => ({ ...current, jobRolesText: event.target.value }));
                setFieldErrors((current) => ({ ...current, jobRoles: '' }));
              }}
              placeholder={'Comics Artist\nBook/Magazine Illustrator\nJunior Java Developer'}
              className="admin-text-input min-h-[1.52rem] resize-y rounded-[0.16rem]"
            />
          </InputField>
        </div>
      </FormSection>
    </div>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[0.208rem] border border-[#d2e0e2] bg-[rgba(255,255,255,0.76)] p-4 shadow-[0_12px_28px_rgba(54,79,92,0.045)]">
      <div className="mb-4 border-b border-[#e0eaec] pb-3">
        <p className="text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#2f9d8f]">
          {eyebrow}
        </p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h4 className="text-fluid-base font-semibold tracking-[-0.02em] text-[#173b47]">
            {title}
          </h4>
          <p className="max-w-[4.96rem] text-fluid-xs leading-5 text-[#6b8590] sm:text-right">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
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
    <div className="min-w-0">
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

export default AdminSubjects;
