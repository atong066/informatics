import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiEdit3, FiRefreshCcw, FiUsers } from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import NotificationPopup from '../../components/NotificationPopup';
import AdminLayout from '../../layout/admin/AdminLayout';
import {
  getFullName,
  type AdminCurriculum,
  type AdminOverviewResponse,
  type AdminSection,
  useAdminOverview,
} from './adminData';

type SectionTeacherDraft = {
  subjectId: string;
  subjectTitle: string;
  subjectCode: string;
  teacherId: string;
  schedule: string;
};

type SectionFormState = {
  name: string;
  course: string;
  batchNumber: string;
  sectionNumber: string;
  adviserId: string;
  curriculumId: string;
  subjectTeachers: SectionTeacherDraft[];
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

const courseOptions = [
  { value: 'DCS', label: 'DCS | Diploma in Computer Studies' },
  { value: 'DIT', label: 'DIT | Diploma in Information Technology' },
];

function emptySectionForm(): SectionFormState {
  return {
    name: '',
    course: '',
    batchNumber: '',
    sectionNumber: '',
    adviserId: '',
    curriculumId: '',
    subjectTeachers: [],
  };
}

function buildSectionLabel(course: string, batchNumber: string, sectionNumber: string) {
  const normalizedCourse = course.trim().toUpperCase();
  const normalizedBatch = batchNumber.trim().replace(/^B/i, '');
  const normalizedSection = sectionNumber.trim();

  if (!normalizedCourse || !normalizedBatch || !normalizedSection) {
    return '';
  }

  return [normalizedCourse, `B${normalizedBatch}`, normalizedSection]
    .filter(Boolean)
    .join(' - ');
}

function parseSectionLabel(sectionName: string) {
  const match = sectionName
    .trim()
    .match(/^([A-Za-z0-9]+)\s*-\s*B?(\d+)(?:\s*-\s*([A-Za-z0-9]+))?$/i);

  if (!match) {
    return {
      course: '',
      batchNumber: '',
      sectionNumber: '',
    };
  }

  return {
    course: match[1]?.toUpperCase() ?? '',
    batchNumber: match[2] ?? '',
    sectionNumber: match[3] ?? '',
  };
}

function buildSubjectTeacherDrafts(
  curriculum?: AdminCurriculum,
  assignmentBySubjectId = new Map<string, { teacherId: string; schedule: string }>(),
) {
  return (curriculum?.subjects ?? []).map((subject) => ({
    subjectId: subject.subjectId,
    subjectTitle: subject.subjectTitle,
    subjectCode: subject.subjectCode,
    teacherId: assignmentBySubjectId.get(subject.subjectId)?.teacherId ?? '',
    schedule: assignmentBySubjectId.get(subject.subjectId)?.schedule ?? '',
  }));
}

function AdminSections() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, adminOverviewQuery } = useAdminOverview();
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySectionForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const fullName = getFullName(activeUser);
  const curriculums = adminOverviewQuery.data?.curriculums ?? [];
  const sections = adminOverviewQuery.data?.sections ?? [];
  const facultyUsers = adminOverviewQuery.data?.facultyUsers ?? [];
  const curriculumById = useMemo(
    () => new Map(curriculums.map((curriculum) => [curriculum.id, curriculum])),
    [curriculums],
  );
  const curriculumOptions = useMemo(
    () =>
      [
        { value: '', label: 'No curriculum yet' },
        ...curriculums.map((curriculum) => ({
          value: curriculum.id,
          label: `${curriculum.title} | ${curriculum.code}`,
        })),
      ],
    [curriculums],
  );
  const facultyOptions = useMemo(
    () => [
      { value: '', label: 'No assignment yet' },
      ...facultyUsers.map((facultyUser) => ({
        value: facultyUser.id,
        label: `${facultyUser.fullName} | ${facultyUser.section || 'Faculty'}`,
      })),
    ],
    [facultyUsers],
  );

  const saveSectionMutation = useMutation({
    mutationFn: async (payload: SectionFormState) => {
      const endpoint = editingSectionId
        ? `/api/admin/sections/${editingSectionId}`
        : '/api/admin/sections';
      const response = await fetch(endpoint, {
        method: editingSectionId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: payload.name || buildSectionLabel(payload.course, payload.batchNumber, payload.sectionNumber),
          course: payload.course,
          batchNumber: payload.batchNumber,
          sectionNumber: payload.sectionNumber,
          adviserId: payload.adviserId,
          curriculumId: payload.curriculumId,
          subjectTeachers: payload.subjectTeachers.map((entry) => ({
            subjectId: entry.subjectId,
            teacherId: entry.teacherId,
            schedule: entry.schedule,
          })),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save section') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        message: data.message ?? 'Section saved successfully',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      setNotification({
        open: true,
        title: editingSectionId ? 'Section updated' : 'Section created',
        message: result.message,
        variant: 'success',
      });
      resetForm();
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save section',
        message: error.message || 'Please review the section details and try again.',
        variant: 'error',
      });
    },
  });

  function resetForm() {
    setEditingSectionId(null);
    setSectionForm(emptySectionForm());
    setFieldErrors({});
  }

  function applyCurriculum(
    curriculumId: string,
    existingTeacherBySubjectId?: Map<string, { teacherId: string; schedule: string }>,
  ) {
    const curriculum = curriculumById.get(curriculumId);
    setSectionForm((current) => ({
      ...current,
      curriculumId,
      subjectTeachers: buildSubjectTeacherDrafts(
        curriculum,
        existingTeacherBySubjectId
          ?? new Map(current.subjectTeachers.map((entry) => [
            entry.subjectId,
            {
              teacherId: entry.teacherId,
              schedule: entry.schedule,
            },
          ])),
      ),
    }));
    setFieldErrors((current) => ({ ...current, curriculumId: '', subjectTeachers: '' }));
  }

  function startEditing(section: AdminSection) {
    const parsedSection = section.course && section.batchNumber
      ? {
        course: section.course,
        batchNumber: section.batchNumber,
        sectionNumber: section.sectionNumber,
      }
      : parseSectionLabel(section.name);
    const assignmentBySubjectId = new Map(
      section.subjectAssignments.map((assignment) => [
        assignment.subjectId,
        {
          teacherId: assignment.teacherId ?? '',
          schedule: assignment.schedule ?? '',
        },
      ]),
    );

    setEditingSectionId(section.id);
    setSectionForm({
      name: section.name,
      course: parsedSection.course,
      batchNumber: parsedSection.batchNumber,
      sectionNumber: parsedSection.sectionNumber,
      adviserId: section.adviserId ?? '',
      curriculumId: section.curriculumId ?? '',
      subjectTeachers: buildSubjectTeacherDrafts(
        curriculumById.get(section.curriculumId ?? ''),
        assignmentBySubjectId,
      ),
    });
    setFieldErrors({});
  }

  function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    const sectionName = buildSectionLabel(
      sectionForm.course,
      sectionForm.batchNumber,
      sectionForm.sectionNumber,
    );

    if (!sectionForm.course.trim()) {
      nextErrors.course = 'Course is required';
    }

    if (!sectionForm.batchNumber.trim()) {
      nextErrors.batchNumber = 'Batch number is required';
    }

    if (!sectionForm.sectionNumber.trim()) {
      nextErrors.sectionNumber = 'Section is required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    saveSectionMutation.mutate({
      name: sectionName,
      course: sectionForm.course.trim().toUpperCase(),
      batchNumber: sectionForm.batchNumber.trim().replace(/^B/i, ''),
      sectionNumber: sectionForm.sectionNumber.trim(),
      adviserId: sectionForm.adviserId,
      curriculumId: sectionForm.curriculumId,
      subjectTeachers: sectionForm.subjectTeachers,
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
      pageTitle="Sections"
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
            Section planning
          </p>
          <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.05em] text-[#173b47]">
            Create sections now, connect curriculum when it is ready.
          </h1>
          <p className="mt-2 max-w-3xl text-fluid-sm leading-6 text-[#607c88]">
            Curriculum is optional during section setup. Assign faculty teaching loads, subjects,
            and schedules from Faculty management.
          </p>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-[430px_minmax(0,1fr)] xl:items-start">
          <section className="rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-fluid-xl font-semibold text-[#173b47]">
                  {editingSectionId ? 'Edit section' : 'Add section'}
                </p>
                <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                  Choose a course and batch, then add a section number when one batch has multiple sections.
                </p>
              </div>
              {editingSectionId ? (
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
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <InputField label="Course" error={fieldErrors.course}>
                  <CustomSelect
                    id="section-course"
                    value={sectionForm.course}
                    onChange={(value) => {
                      setSectionForm((current) => ({
                        ...current,
                        course: value,
                        name: buildSectionLabel(value, current.batchNumber, current.sectionNumber),
                      }));
                      setFieldErrors((current) => ({ ...current, course: '', name: '' }));
                    }}
                    options={courseOptions}
                    placeholder="Choose course"
                    tone="muted"
                  />
                </InputField>

                <InputField label="Batch number" error={fieldErrors.batchNumber}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sectionForm.batchNumber}
                    onChange={(event) => {
                      const batchNumber = event.target.value.replace(/^B/i, '');
                      setSectionForm((current) => ({
                        ...current,
                        batchNumber,
                        name: buildSectionLabel(current.course, batchNumber, current.sectionNumber),
                      }));
                      setFieldErrors((current) => ({ ...current, batchNumber: '', name: '' }));
                    }}
                    placeholder="7"
                    className="w-full rounded-2xl border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                  />
                </InputField>

                <InputField label="Section" error={fieldErrors.sectionNumber}>
                  <input
                    type="text"
                    value={sectionForm.sectionNumber}
                    onChange={(event) => {
                      const sectionNumber = event.target.value;
                      setSectionForm((current) => ({
                        ...current,
                        sectionNumber,
                        name: buildSectionLabel(current.course, current.batchNumber, sectionNumber),
                      }));
                      setFieldErrors((current) => ({ ...current, sectionNumber: '', name: '' }));
                    }}
                    placeholder="2"
                    className="w-full rounded-2xl border border-[#c9d7db] bg-white px-4 py-3 text-fluid-base text-[#21485a] outline-none transition focus:border-[#6ea7a0] focus:ring-4 focus:ring-[rgba(110,167,160,0.14)]"
                  />
                </InputField>
              </div>

              <div className="rounded-[1.1rem] border border-[#d1dde1] bg-white px-4 py-3">
                <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#7b95a1]">
                  Section label
                </p>
                <p className="mt-1 text-fluid-base font-semibold text-[#173b47]">
                  {buildSectionLabel(sectionForm.course, sectionForm.batchNumber, sectionForm.sectionNumber)
                    || 'Choose course, batch, and section'}
                </p>
              </div>

              <InputField label="Curriculum (optional)" error={fieldErrors.curriculumId}>
                <CustomSelect
                  id="section-curriculum"
                  value={sectionForm.curriculumId}
                  onChange={(value) => applyCurriculum(value)}
                  options={curriculumOptions}
                  placeholder={curriculumOptions.length ? 'Optional curriculum' : 'No curriculums yet'}
                  tone="muted"
                />
              </InputField>

              <InputField label="Adviser">
                <CustomSelect
                  id="section-adviser"
                  value={sectionForm.adviserId}
                  onChange={(value) => setSectionForm((current) => ({ ...current, adviserId: value }))}
                  options={facultyOptions}
                  placeholder="No adviser yet"
                  tone="muted"
                />
              </InputField>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saveSectionMutation.isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-3 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiUsers className="h-4 w-4" />
                  {saveSectionMutation.isPending ? 'Saving...' : editingSectionId ? 'Update section' : 'Create section'}
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
                  <p className="text-fluid-xl font-semibold text-[#173b47]">Existing sections</p>
                  <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                    Sections can stay unlinked until curriculum planning is ready. Faculty loads
                    control which subjects become visible to students.
                  </p>
                </div>
                <div className="rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
                  {sections.length} sections
                </div>
              </div>

              <div className="mt-5 min-h-0 flex-1">
                {adminOverviewQuery.isLoading ? (
                  <EmptyState title="Loading sections..." description="The section list is being prepared." />
                ) : adminOverviewQuery.isError ? (
                  <EmptyState title="Unable to load sections" description="Refresh the page or try again in a moment." />
                ) : sections.length ? (
                  <div className="scrollbar-super-thin h-full min-h-[20rem] max-h-[28rem] overflow-auto rounded-[1.45rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)] sm:max-h-[32rem] xl:max-h-[calc(100vh-18rem)]">
                    <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell className="w-[18%] rounded-tl-[1.45rem]">Section</TableHeadCell>
                          <TableHeadCell className="w-[24%]">Curriculum</TableHeadCell>
                          <TableHeadCell className="w-[18%]">Adviser</TableHeadCell>
                          <TableHeadCell className="w-[10%]">Students</TableHeadCell>
                          <TableHeadCell className="w-[18%]">Teacher load</TableHeadCell>
                          <TableHeadCell className="w-[12%] rounded-tr-[1.45rem] text-right">Edit</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {sections.map((section, index) => {
                          const assignedTeachers = section.subjectAssignments.filter((assignment) => assignment.teacherId).length;

                          return (
                            <tr
                              key={section.id}
                              className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                            >
                              <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                                <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                                  {section.name}
                                </p>
                              </td>
                              <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                                <p className="text-fluid-sm font-semibold text-[#4d6a77]">
                                  {section.curriculumTitle || 'No curriculum'}
                                </p>
                                <p className="mt-1 text-fluid-xs uppercase tracking-[0.18em] text-[#7b95a1]">
                                  {section.curriculumCode || 'Not linked yet'}
                                </p>
                              </td>
                              <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                                <p className="text-fluid-sm font-semibold text-[#4d6a77]">
                                  {section.adviserName || 'No adviser yet'}
                                </p>
                                <p className="mt-1 text-fluid-xs text-[#7b95a1]">
                                  {section.adviserUsername ? `@${section.adviserUsername}` : 'Optional'}
                                </p>
                              </td>
                              <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                                <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                  {section.studentCount}
                                </span>
                              </td>
                              <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                                <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                  {assignedTeachers}/{section.subjectAssignments.length} assigned
                                </span>
                              </td>
                              <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-right">
                                <button
                                  type="button"
                                  onClick={() => startEditing(section)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                                  aria-label={`Edit ${section.name}`}
                                >
                                  <FiEdit3 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No sections yet" description="Create your first section using the form on the left." />
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
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[1.35rem] border border-dashed border-[#d4e0e4] bg-[linear-gradient(180deg,#fbfdfd_0%,#eef4f6_100%)] text-center ${compact ? 'px-5 py-7' : 'px-6 py-10'}`}>
      <p className="text-fluid-md font-semibold text-[#173b47]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">{description}</p>
    </div>
  );
}

export default AdminSections;
