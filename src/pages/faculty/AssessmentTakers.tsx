import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiSearch,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import CustomSelect from '../../components/CustomSelect';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { getStoredToken } from '../../lib/auth';

type AssessmentTakersResponse = {
  subject: {
    id: string;
    title: string;
    code: string;
  };
  assessment: {
    id: string;
    title: string;
    detail: string;
    schedule: string;
    assessmentType: 'quiz' | 'quarter-exam';
    targetSections: string[];
    targetSectionLabel: string;
    startTime: string;
    endTime: string;
    questionCount: number;
    status: string;
    takenCount: number;
    totalStudents: number;
  };
  attemptedStudents: Array<{
    id: string;
    attemptId: string;
    fullName: string;
    section: string;
    email: string;
    username: string;
    profileImage?: string | null;
    status: string;
    score: number;
    totalPoints: number;
    percentage: number;
    startedAt: string;
    submittedAt: string;
  }>;
};

function formatCalendarDate(value: string) {
  if (!value) {
    return 'No schedule';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Not available';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAssessmentType(value: 'quiz' | 'quarter-exam') {
  return value === 'quarter-exam' ? 'Quarter exam' : 'Quiz';
}

function formatTimeLabel(value: string) {
  if (!value) {
    return '';
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAssessmentWindow(startTime: string, endTime: string) {
  if (!startTime && !endTime) {
    return 'Time not set';
  }

  if (startTime && endTime) {
    return `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`;
  }

  return formatTimeLabel(startTime || endTime);
}

function statusTone(status: string) {
  switch (status) {
    case 'Graded':
      return 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]';
    case 'Submitted':
      return 'border-[#c8d9ec] bg-[#eef4fa] text-[#2f78bc]';
    default:
      return 'border-[#d6e1ea] bg-[#f4f8fb] text-[#607790]';
  }
}

function AssessmentTakers() {
  const { subjectId, assessmentId } = useParams();
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const [searchValue, setSearchValue] = useState('');
  const [selectedSection, setSelectedSection] = useState('All sections');

  const takersQuery = useQuery({
    queryKey: ['faculty-assessment-takers', subjectId, assessmentId],
    queryFn: async () => {
      const response = await fetch(
        `/api/faculty/subjects/${subjectId}/assessments/${assessmentId}/takers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = (await response.json()) as {
        message?: string;
        data?: AssessmentTakersResponse;
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load assessment takers');
      }

      return data.data;
    },
    enabled: Boolean(token && activeUser && !isError && subjectId && assessmentId),
  });

  const fullName = useMemo(
    () =>
      [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName]
        .filter(Boolean)
        .join(' '),
    [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName],
  );

  const sectionOptions = useMemo(() => {
    const sections = new Set(
      (takersQuery.data?.attemptedStudents ?? []).map((student) => student.section).filter(Boolean),
    );

    return ['All sections', ...Array.from(sections).sort((a, b) => a.localeCompare(b))];
  }, [takersQuery.data?.attemptedStudents]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return (takersQuery.data?.attemptedStudents ?? []).filter((student) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          student.fullName,
          student.section,
          student.email,
          student.username,
          student.status,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));
      const matchesSection =
        selectedSection === 'All sections' || student.section === selectedSection;

      return matchesSearch && matchesSection;
    });
  }, [searchValue, selectedSection, takersQuery.data?.attemptedStudents]);

  const averagePercentage = useMemo(() => {
    if (filteredStudents.length === 0) {
      return 0;
    }

    const total = filteredStudents.reduce((sum, student) => sum + student.percentage, 0);
    return total / filteredStudents.length;
  }, [filteredStudents]);

  if (!activeUser || isError) {
    return null;
  }

  if (!takersQuery.isLoading && takersQuery.isError) {
    return <Navigate to={`/faculty/subjects/${subjectId}`} replace />;
  }

  const payload = takersQuery.data;

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Assessment takers"
      pageTitle={payload?.assessment.title ?? 'Assessment takers'}
    >
      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[1.65rem] border border-[#b2c3d1] bg-[linear-gradient(180deg,rgba(212,222,233,0.97)_0%,rgba(201,212,225,0.95)_100%)] px-5 py-5 shadow-[0_10px_22px_rgba(27,46,70,0.08)]">
          {takersQuery.isLoading ? (
            <p className="text-[0.95rem] text-[#6b8198]">Loading assessment takers...</p>
          ) : payload ? (
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => navigate(`/faculty/subjects/${subjectId}`)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1.5 text-[0.78rem] font-semibold text-[#2f78bc] transition hover:bg-[rgba(218,227,236,0.98)]"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  Back to assessments
                </button>

                <p className="mt-4 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#2f78bc]">
                  {payload.subject.title} | {payload.subject.code}
                </p>
                <h1 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-[#173b70]">
                  {payload.assessment.title}
                </h1>
                <p className="mt-2 max-w-3xl text-[0.92rem] leading-[1.65] text-[#5e7891]">
                  {payload.assessment.detail}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#2f78bc]">
                    {payload.assessment.targetSectionLabel}
                  </span>
                  <span className="rounded-full border border-[#b7c8d6] bg-[rgba(210,220,231,0.96)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#607790]">
                    {formatAssessmentWindow(payload.assessment.startTime, payload.assessment.endTime)}
                  </span>
                </div>
              </div>

              <div className="grid min-w-[15rem] gap-3 rounded-[1.2rem] bg-[linear-gradient(180deg,#365678_0%,#2d4868_100%)] px-4 py-4 text-white shadow-[0_10px_20px_rgba(27,46,70,0.12)]">
                <div className="flex items-center gap-2 text-[#d5e2ef]">
                  <FiCheckCircle className="h-4 w-4" />
                  <p className="text-[0.76rem] uppercase tracking-[0.16em]">Taker summary</p>
                </div>
                <p className="text-[1.05rem] font-semibold">
                  {payload.assessment.takenCount} of {payload.assessment.totalStudents} students
                </p>
                <p className="text-[0.82rem] text-[#d5e2ef]">
                  Schedule: {formatCalendarDate(payload.assessment.schedule)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {payload ? (
          <section className="mt-5 overflow-hidden rounded-[1.9rem] border border-[#b2c3d1] bg-[linear-gradient(180deg,rgba(209,220,231,0.95)_0%,rgba(197,209,223,0.93)_100%)] shadow-[0_14px_32px_rgba(27,46,70,0.09)]">
            <div className="border-b border-[#bfcedb] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
                      Assessment Results
                    </p>
                    <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-[#173b70]">
                      Review students who already took this assessment.
                    </h2>
                    <p className="mt-2 text-[0.86rem] leading-6 text-[#5f7893]">
                      Filter by section, scan the latest submissions, and review score progress
                      from one table view.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <ToolbarMetric label="Taken" value={String(payload.assessment.takenCount)} />
                    <ToolbarMetric
                      label="Pending"
                      value={String(Math.max(payload.assessment.totalStudents - payload.assessment.takenCount, 0))}
                    />
                    <ToolbarMetric label="Average" value={`${averagePercentage.toFixed(1)}%`} />
                    <ToolbarMetric label="Questions" value={String(payload.assessment.questionCount)} />
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-end">
                  <FilterShell label="Section">
                    <CustomSelect
                      id="faculty-assessment-section-filter"
                      options={sectionOptions}
                      placeholder="All sections"
                      value={selectedSection}
                      onChange={(value) => setSelectedSection(value)}
                      tone="muted"
                    />
                  </FilterShell>

                  <div className="rounded-[1.4rem] border border-[#b7c8d6] bg-[rgba(209,220,231,0.92)] px-4 py-3.5">
                    <label
                      htmlFor="faculty-assessment-search"
                      className="mb-2 block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6f89a4]"
                    >
                      Search
                    </label>
                    <div className="flex items-center gap-3 rounded-[1.15rem] border border-[#b6c7d6] bg-[rgba(214,224,234,0.94)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                      <FiSearch className="h-4 w-4 text-[#6f89a4]" />
                      <input
                        id="faculty-assessment-search"
                        type="search"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search student, email, username, section"
                        className="w-full bg-transparent text-[15px] text-[#21486d] outline-none placeholder:text-[#7f98b1]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={<FiUsers className="h-4 w-4" />} label="Filtered takers" value={String(filteredStudents.length)} />
                <StatCard icon={<FiClock className="h-4 w-4" />} label="Assessment type" value={formatAssessmentType(payload.assessment.assessmentType)} />
                <StatCard icon={<FiTrendingUp className="h-4 w-4" />} label="Schedule" value={formatCalendarDate(payload.assessment.schedule)} />
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-[#b8c8d6] bg-[linear-gradient(180deg,#d8e2eb_0%,#ced9e4_100%)] shadow-[0_10px_24px_rgba(27,46,70,0.07)]">
                {filteredStudents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[rgba(221,229,237,0.98)] text-left">
                          <TableHead>Student</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Submitted</TableHead>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student.attemptId} className="border-t border-[#c6d4df]">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-[#173b70]">{student.fullName}</p>
                                <p className="mt-1 text-[0.78rem] text-[#5e7891]">@{student.username}</p>
                              </div>
                            </TableCell>
                            <TableCell>{student.section}</TableCell>
                            <TableCell>
                              <a
                                href={`mailto:${student.email}`}
                                className="inline-flex items-center gap-2 font-medium text-[#2f78bc] transition hover:text-[#215f99]"
                              >
                                <FiMail className="h-3.5 w-3.5" />
                                <span className="truncate">{student.email}</span>
                              </a>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-[0.72rem] font-semibold ${statusTone(student.status)}`}>
                                {student.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-[#173b70]">
                                  {student.score} / {student.totalPoints}
                                </p>
                                <p className="mt-1 text-[0.78rem] text-[#5e7891]">
                                  {student.percentage.toFixed(1)}%
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{formatDateTime(student.submittedAt)}</TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-[1rem] font-semibold text-[#173b70]">No students found</p>
                    <p className="mt-2 text-[0.84rem] text-[#7088a1]">
                      Try another section filter, or wait for students to complete the assessment.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </FacultyLayout>
  );
}

function ToolbarMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[8.2rem] rounded-[1.15rem] border border-[#b8c7d4] bg-[linear-gradient(180deg,#dbe5ed_0%,#d2dde8_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#6f89a4]">
        {label}
      </p>
      <p className="mt-2 text-[1.08rem] font-semibold text-[#173b70]">{value}</p>
    </div>
  );
}

function FilterShell({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[#b7c8d6] bg-[rgba(209,220,231,0.92)] px-4 py-3.5">
      <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#6f89a4]">
        {label}
      </p>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[#b7c8d7] bg-[linear-gradient(180deg,#dbe5ed_0%,#d0dbe5_100%)] p-4">
      <div className="flex items-center gap-2 text-[#2f78bc]">
        {icon}
        <p className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
          {label}
        </p>
      </div>
      <p className="mt-3 text-[1.2rem] font-semibold text-[#173b70]">{value}</p>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-[#c6d4df] px-4 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#6d86a0]">
      {children}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td className="border-b border-[#c6d4df] px-4 py-4 text-[0.84rem] text-[#37506c]">
      {children}
    </td>
  );
}

export default AssessmentTakers;
