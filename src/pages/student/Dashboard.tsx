import { useMemo, type ReactNode } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiCode,
  FiCpu,
  FiDatabase,
  FiLayers,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import {
  type StudentSubject,
  useStudentSubjects,
} from '../../hooks/useStudentSubjects';
import StudentLayout from '../../layout/student/StudentLayout';
import { getStoredToken } from '../../lib/auth';

type SubjectDashboardDetails = {
  id: string;
  lessonProgress: Array<{
    id: string;
    lesson: string;
    completion: number;
    state: string;
  }>;
  modules: Array<{
    id: string;
    title: string;
    completion?: number;
    progress: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    status: string;
  }>;
  assessments: Array<{
    id: string;
    title: string;
    schedule: string;
    status: string;
  }>;
};

type SubjectProgressItem = StudentSubject & {
  progress: number;
  lessons: number;
  modules: number;
  completedCount: number;
  remainingCount: number;
};

const EMPTY_SUBJECTS: StudentSubject[] = [];

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

function getProgressState(progress: number, remainingCount: number) {
  if (remainingCount === 0 && progress >= 100) {
    return {
      label: 'Complete',
      className: 'border-[#bfe5cf] bg-[#eef8f2] text-[#14724f]',
    };
  }

  if (progress >= 75) {
    return {
      label: 'On track',
      className: 'border-[#c9dcf0] bg-[#edf5fd] text-[#255e98]',
    };
  }

  if (progress >= 40) {
    return {
      label: 'In progress',
      className: 'border-[#efd9bb] bg-[#fff5e8] text-[#a66517]',
    };
  }

  return {
    label: 'Needs focus',
    className: 'border-[#eed2cb] bg-[#fff1ed] text-[#b25545]',
  };
}

function SubjectIconGlyph({
  iconKey,
  className,
}: {
  iconKey: string;
  className: string;
}) {
  switch (iconKey) {
    case 'database':
      return <FiDatabase className={className} />;
    case 'code':
      return <FiCode className={className} />;
    case 'cpu':
      return <FiCpu className={className} />;
    default:
      return <FiBookOpen className={className} />;
  }
}

function Dashboard() {
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const subjectsQuery = useStudentSubjects(Boolean(activeUser && !isError));
  const subjects = subjectsQuery.data ?? EMPTY_SUBJECTS;

  const subjectDetailsQueries = useQueries({
    queries: subjects.map((subject) => ({
      queryKey: ['student-dashboard-subject-detail', subject.id],
      queryFn: async () => {
        const response = await fetch(`/api/student/subjects/${subject.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = (await response.json()) as {
          message?: string;
          data?: SubjectDashboardDetails;
        };

        if (!response.ok || !data.data) {
          throw new Error(data.message || 'Failed to load dashboard subject details');
        }

        return data.data;
      },
      enabled: Boolean(token && activeUser && !isError),
      staleTime: 60_000,
    })),
  });

  const isDashboardLoading =
    subjectsQuery.isLoading ||
    subjectDetailsQueries.some((query) => query.isLoading);

  const hasDashboardError =
    subjectsQuery.isError ||
    subjectDetailsQueries.some((query) => query.isError);

  const fullName = useMemo(
    () =>
      [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName]
        .filter(Boolean)
        .join(' '),
    [activeUser],
  );

  const detailEntries = useMemo(
    () =>
      subjects.map((subject, index) => ({
        subject,
        details: subjectDetailsQueries[index]?.data ?? null,
      })),
    [subjectDetailsQueries, subjects],
  );

  const subjectProgress = useMemo<SubjectProgressItem[]>(
    () =>
      detailEntries.map(({ subject, details }) => {
        const lessons = details?.lessonProgress ?? [];
        const modules = details?.modules ?? [];
        const completedLessons = lessons.filter((item) => item.state === 'Completed').length;
        const completedModules = modules.filter((item) => item.progress === 'Completed').length;
        const progress = average([
          ...lessons.map((item) => item.completion),
          ...modules.map((item) => item.completion ?? 0),
        ]);

        return {
          ...subject,
          progress,
          lessons: lessons.length,
          modules: modules.length,
          completedCount: completedLessons + completedModules,
          remainingCount:
            lessons.length +
            modules.length -
            completedLessons -
            completedModules,
        };
      }),
    [detailEntries],
  );

  const summary = useMemo(() => {
    const allLessons = detailEntries.flatMap((entry) => entry.details?.lessonProgress ?? []);
    const allModules = detailEntries.flatMap((entry) => entry.details?.modules ?? []);
    const allAssignments = detailEntries.flatMap((entry) => entry.details?.assignments ?? []);
    const allAssessments = detailEntries.flatMap((entry) => entry.details?.assessments ?? []);
    const completedLessons = allLessons.filter((item) => item.state === 'Completed').length;
    const completedModules = allModules.filter((item) => item.progress === 'Completed').length;
    const openModules = allModules.length - completedModules;

    return {
      subjectCount: subjects.length,
      totalLessons: allLessons.length,
      totalModules: allModules.length,
      totalAssignments: allAssignments.length,
      totalAssessments: allAssessments.length,
      completedLessons,
      completedModules,
      openLessons: allLessons.length - completedLessons,
      openModules,
      averageProgress: average([
        ...allLessons.map((item) => item.completion),
        ...allModules.map((item) => item.completion ?? 0),
      ]),
    };
  }, [detailEntries, subjects.length]);

  const focusSubject = useMemo(() => {
    const openSubjects = subjectProgress
      .filter((item) => item.remainingCount > 0)
      .sort((left, right) => left.progress - right.progress || right.remainingCount - left.remainingCount);

    return openSubjects[0] ?? subjectProgress[0] ?? null;
  }, [subjectProgress]);

  const nextSteps = useMemo(
    () =>
      detailEntries
        .flatMap(({ subject, details }) => {
          if (!details) {
            return [];
          }

          const lessons = details.lessonProgress
            .filter((item) => item.state !== 'Completed')
            .map((item) => ({
              id: `lesson-${item.id}`,
              title: item.lesson,
              subtitle: `${subject.title} lesson`,
              status: `${item.completion}% complete`,
              progress: item.completion,
              subjectId: subject.id,
            }));

          const modules = details.modules
            .filter((item) => item.progress !== 'Completed')
            .map((item) => ({
              id: `module-${item.id}`,
              title: item.title,
              subtitle: `${subject.title} module`,
              status: `${item.completion ?? 0}% complete`,
              progress: item.completion ?? 0,
              subjectId: subject.id,
            }));

          return [...lessons, ...modules];
        })
        .sort((left, right) => left.progress - right.progress)
        .slice(0, 5),
    [detailEntries],
  );

  const coverageRows = useMemo(() => {
    const rows = [
      {
        label: 'Lessons',
        value: summary.totalLessons,
        helper:
          summary.totalLessons > 0
            ? `${summary.completedLessons} completed`
            : 'No lesson records yet',
      },
      {
        label: 'Modules',
        value: summary.totalModules,
        helper:
          summary.totalModules > 0
            ? `${summary.completedModules} completed`
            : 'No module records yet',
      },
      {
        label: 'Assignments',
        value: summary.totalAssignments,
        helper:
          summary.totalAssignments > 0
            ? 'Live assignment records available'
            : 'No assignment records yet',
      },
      {
        label: 'Assessments',
        value: summary.totalAssessments,
        helper:
          summary.totalAssessments > 0
            ? 'Live assessment records available'
            : 'No assessment records yet',
      },
    ];

    const maxValue = Math.max(...rows.map((row) => row.value), 1);

    return rows.map((row) => ({
      ...row,
      percent: row.value === 0 ? 10 : Math.max(18, Math.round((row.value / maxValue) * 100)),
    }));
  }, [summary]);

  if (!activeUser || isError) {
    return null;
  }

  return (
    <StudentLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
    >
      <div className="mx-auto flex w-full max-w-[15.36rem] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
        <section
          className="dashboard-rise relative min-w-0 max-w-full overflow-hidden rounded-[0.376rem] border border-[#173552] bg-[#0d2339] px-6 py-6 text-white shadow-[0_28px_70px_rgba(8,20,35,0.28)] sm:px-8 sm:py-8"
          style={{ animationDelay: '40ms' }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(91,178,255,0.18),transparent_30%),radial-gradient(circle_at_75%_25%,rgba(113,209,167,0.1),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
          <div className="relative grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px] xl:items-end">
            <div className="min-w-0">
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.28em] text-[#96b9d8]">
                Student Workspace
              </p>
              <h1 className="mt-4 max-w-[11ch] font-display text-fluid-4xl leading-[0.93] tracking-[-0.05em] text-white sm:text-fluid-5xl">
                Study board for {activeUser.firstName}.
              </h1>
              <p className="mt-4 max-w-2xl text-fluid-md leading-7 text-[#c5d5e5]">
                Current section, live subject load, and lesson progress synced from
                your latest records.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <InfoPill label="Section" value={activeUser.section || 'Not assigned'} />
                <InfoPill label="Subjects" value={String(summary.subjectCount)} />
                <InfoPill
                  label="Open items"
                  value={String(summary.openLessons + summary.openModules)}
                />
              </div>
            </div>

            <div className="min-w-0 rounded-[0.288rem] border border-white/10 bg-white/7 p-4 backdrop-blur-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ProgressRing progress={summary.averageProgress} label="Synced" />

                <div className="min-w-0 flex-1">
                  <p className="text-fluid-2xs font-semibold uppercase tracking-[0.24em] text-[#96b9d8]">
                    Focus Subject
                  </p>
                  <h2 className="mt-2 text-fluid-xl font-semibold tracking-[-0.03em] text-white">
                    {focusSubject?.title ?? 'No active subject yet'}
                  </h2>
                  <p className="mt-2 text-fluid-sm leading-6 text-[#c5d5e5]">
                    {focusSubject
                      ? `${focusSubject.remainingCount} open records and ${focusSubject.progress}% completion.`
                      : 'Subject data will appear here once records are available.'}
                  </p>

                  <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-fluid-sm text-[#d2dfeb]">
                    <MetaRow label="Email" value={activeUser.email} />
                    <MetaRow label="Username" value={`@${activeUser.username}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            title="Courses"
            value={String(summary.subjectCount)}
            detail="Live subjects in your current workspace"
            icon={<FiBookOpen className="h-5 w-5" />}
            delay="90ms"
          />
          <MetricTile
            title="Completed Lessons"
            value={String(summary.completedLessons)}
            detail="Lesson records marked as complete"
            icon={<FiCheckCircle className="h-5 w-5" />}
            delay="140ms"
          />
          <MetricTile
            title="Open Records"
            value={String(summary.openLessons + summary.openModules)}
            detail="Lessons and modules still in progress"
            icon={<FiClock className="h-5 w-5" />}
            delay="190ms"
          />
          <MetricTile
            title="Average Progress"
            value={`${summary.averageProgress}%`}
            detail="Completion average across synced records"
            icon={<FiLayers className="h-5 w-5" />}
            delay="240ms"
          />
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <article
            className="dashboard-rise min-w-0 max-w-full rounded-[0.32rem] border border-[#d9e3ec] bg-[rgba(249,252,254,0.86)] p-4 shadow-[0_18px_40px_rgba(30,52,78,0.08)] backdrop-blur-sm sm:p-5"
            style={{ animationDelay: '140ms' }}
          >
            <SectionHeading
              title="Progress Board"
              detail="Each subject is ranked from the data already stored in your account."
            />

            <div className="mt-4 overflow-hidden rounded-[0.232rem] border border-[#d9e5ee] bg-white/84">
              {hasDashboardError ? (
                <EmptyState
                  title="Dashboard data could not be loaded"
                  body="Try refreshing the page after the API records are available again."
                />
              ) : isDashboardLoading ? (
                <PanelMessage message="Loading subject progress..." />
              ) : subjectProgress.length > 0 ? (
                <div className="divide-y divide-[#e6eef5]">
                  {subjectProgress.map((subject) => (
                    <SubjectRow
                      key={subject.id}
                      subject={subject}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No subject records yet"
                  body="This board will populate as soon as your subjects and progress entries are available."
                />
              )}
            </div>
          </article>

          <div className="grid min-w-0 gap-4">
            <article
              className="dashboard-rise min-w-0 max-w-full rounded-[0.32rem] border border-[#d9e3ec] bg-[rgba(249,252,254,0.86)] p-4 shadow-[0_18px_40px_rgba(30,52,78,0.08)] backdrop-blur-sm sm:p-5"
              style={{ animationDelay: '200ms' }}
            >
              <SectionHeading
                title="Priority Queue"
                detail="The next incomplete lessons and modules with the lowest completion."
              />

              <div className="mt-4 space-y-2.5">
                {hasDashboardError ? (
                  <EmptyState
                    title="Queue unavailable"
                    body="The dashboard could not fetch the next active items right now."
                  />
                ) : isDashboardLoading ? (
                  <PanelMessage message="Loading active items..." />
                ) : nextSteps.length > 0 ? (
                  nextSteps.map((item) => (
                    <Link
                      key={item.id}
                      to={`/student/subjects/${item.subjectId}`}
                      className="dashboard-hover group flex min-w-0 max-w-full items-center gap-3 rounded-[0.192rem] border border-[#dde7ef] bg-white px-3.5 py-3.5"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.152rem] bg-[#edf5ff] text-[#2f78bc]">
                        <FiArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-fluid-md font-semibold text-[#173b70]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-fluid-sm text-[#7088a1]">
                          {item.subtitle}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-[#d6e3ef] bg-[#f4f8fb] px-3 py-1 text-fluid-2xs font-semibold text-[#536f8a]">
                        {item.status}
                      </span>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    title="Nothing is waiting right now"
                    body="There are no incomplete lesson or module records in the current dataset."
                  />
                )}
              </div>
            </article>

            <article
              className="dashboard-rise min-w-0 max-w-full rounded-[0.32rem] border border-[#d9e3ec] bg-[rgba(249,252,254,0.86)] p-4 shadow-[0_18px_40px_rgba(30,52,78,0.08)] backdrop-blur-sm sm:p-5"
              style={{ animationDelay: '250ms' }}
            >
              <SectionHeading
                title="Live Coverage"
                detail="What your current records actually include across the student workspace."
              />

              <div className="mt-4 space-y-3.5">
                {coverageRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-fluid-base font-semibold text-[#173b70]">
                        {row.label}
                      </p>
                      <span className="text-fluid-sm font-semibold text-[#4d6883]">
                        {row.value}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#e6edf4]">
                      <div
                        className="dashboard-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#77c6ff_0%,#2f78bc_100%)]"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-fluid-xs leading-5 text-[#7088a1]">
                      {row.helper}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section
          className="dashboard-rise min-w-0 max-w-full rounded-[0.32rem] border border-[#d9e3ec] bg-[rgba(249,252,254,0.86)] p-4 shadow-[0_18px_40px_rgba(30,52,78,0.08)] backdrop-blur-sm sm:p-5"
          style={{ animationDelay: '290ms' }}
        >
          <SectionHeading
            title="Subject Directory"
            detail="Quick access to each course space, along with the current record density and description."
          />

          <div className="mt-4 grid min-w-0 gap-2.5 lg:grid-cols-2">
            {hasDashboardError ? (
              <EmptyState
                title="Subject directory unavailable"
                body="The dashboard could not load the linked subject records."
              />
            ) : isDashboardLoading ? (
              <PanelMessage message="Loading courses..." />
            ) : subjectProgress.length > 0 ? (
              subjectProgress.map((subject) => (
                <DirectoryItem key={subject.id} subject={subject} />
              ))
            ) : (
              <EmptyState
                title="No courses found"
                body="Subjects will appear here once the backend returns your enrolled courses."
              />
            )}
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

function SectionHeading({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-fluid-xl font-semibold tracking-[-0.03em] text-[#173b70]">
          {title}
        </h2>
        <p className="mt-0.5 text-fluid-sm leading-5 text-[#7088a1]">{detail}</p>
      </div>
    </div>
  );
}

function MetricTile({
  title,
  value,
  detail,
  icon,
  delay,
}: {
  title: string;
  value: string;
  detail: string;
  icon: ReactNode;
  delay: string;
}) {
  return (
    <article
      className="dashboard-rise min-w-0 max-w-full rounded-[0.224rem] border border-[#d9e3ec] bg-[rgba(249,252,254,0.82)] px-4 py-3.5 shadow-[0_14px_30px_rgba(30,52,78,0.06)] backdrop-blur-sm"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
            {title}
          </p>
          <p className="mt-2.5 text-fluid-3xl font-semibold leading-none tracking-[-0.04em] text-[#163b70]">
            {value}
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[0.16rem] bg-[#edf5ff] text-[#2f78bc]">
          {icon}
        </div>
      </div>

      <p className="mt-2 text-fluid-sm leading-5 text-[#7088a1]">{detail}</p>
    </article>
  );
}

function SubjectRow({
  subject,
}: {
  subject: SubjectProgressItem;
}) {
  const state = getProgressState(subject.progress, subject.remainingCount);

  return (
    <Link
      to={`/student/subjects/${subject.id}`}
      className="dashboard-hover group grid min-w-0 max-w-full gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.152rem] bg-[#edf5ff] text-[#2f78bc]">
        <SubjectIconGlyph iconKey={subject.iconKey} className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-fluid-md font-semibold text-[#173b70]">
            {subject.title}
          </h3>
          <span className="rounded-full border border-[#dbe6ef] bg-[#f4f8fb] px-2.5 py-1 text-fluid-2xs font-semibold uppercase tracking-[0.08em] text-[#56718b]">
            {subject.code}
          </span>
        </div>

        <p className="mt-0.5 text-fluid-sm leading-5 text-[#7088a1]">
          {subject.lessons} lessons / {subject.modules} modules / {subject.remainingCount} open
        </p>

        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-2 flex-1 rounded-full bg-[#e3ebf3]">
            <div
              className="dashboard-progress-fill h-full rounded-full bg-[linear-gradient(90deg,#74c3ff_0%,#2f78bc_100%)]"
              style={{ width: `${subject.progress}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-fluid-base font-semibold text-[#173b70]">
            {subject.progress}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span
          className={`rounded-full border px-3 py-1 text-fluid-2xs font-semibold ${state.className}`}
        >
          {state.label}
        </span>
        <FiArrowRight className="h-4 w-4 text-[#6f89a4] transition duration-200 group-hover:translate-x-0.5 group-hover:text-[#2f78bc]" />
      </div>
    </Link>
  );
}

function DirectoryItem({ subject }: { subject: SubjectProgressItem }) {
  return (
    <Link
      to={`/student/subjects/${subject.id}`}
      className="dashboard-hover group flex min-w-0 max-w-full items-start gap-3.5 rounded-[0.216rem] border border-[#dbe6ef] bg-white/76 px-3.5 py-3.5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.152rem] bg-[#edf5ff] text-[#2f78bc]">
        <SubjectIconGlyph iconKey={subject.iconKey} className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-fluid-md font-semibold text-[#173b70]">
            {subject.title}
          </h3>
          <span className="text-fluid-xs font-medium text-[#69829a]">
            {subject.code}
          </span>
        </div>

        <p className="mt-1.5 text-fluid-sm leading-5 text-[#7088a1]">
          {subject.description}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5 text-fluid-2xs text-[#58718b]">
          <DirectoryTag label={`${subject.lessons} lessons`} />
          <DirectoryTag label={`${subject.modules} modules`} />
          <DirectoryTag label={`${subject.completedCount} complete`} />
        </div>
      </div>

      <ProgressRing progress={subject.progress} label="Live" compact />
    </Link>
  );
}

function DirectoryTag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[#dbe6ef] bg-[#f6f9fc] px-2.5 py-1">
      {label}
    </span>
  );
}

function ProgressRing({
  progress,
  label,
  compact = false,
}: {
  progress: number;
  label: string;
  compact?: boolean;
}) {
  const size = compact ? 68 : 110;
  const innerSize = compact ? 54 : 90;
  const accentStop = Math.max(progress, 0) * 3.6;

  return (
    <div
      className="dashboard-ring relative shrink-0 rounded-full p-[1px]"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#79c9ff 0deg, #2f78bc ${accentStop}deg, rgba(200,217,234,0.2) ${accentStop}deg 360deg)`,
      }}
    >
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-full ${
          compact ? 'bg-[#f8fbfe] text-[#173b70]' : 'bg-[#10283f] text-white'
        }`}
        style={{ width: innerSize, height: innerSize, margin: 'auto' }}
      >
        <span
          className={
            compact
              ? 'text-fluid-base font-semibold tracking-[-0.03em]'
              : 'text-fluid-xl font-semibold tracking-[-0.04em]'
          }
        >
          {progress}%
        </span>
        <span
          className={
            compact
              ? 'text-fluid-micro font-semibold uppercase tracking-[0.18em] text-[#6f89a4]'
              : 'text-fluid-3xs font-semibold uppercase tracking-[0.2em] text-[#9bb8d1]'
          }
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/12 bg-white/7 px-3.5 py-2 backdrop-blur-sm">
      <span className="text-fluid-3xs font-semibold uppercase tracking-[0.18em] text-[#93b4d2]">
        {label}
      </span>
      <span className="ml-2 text-fluid-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#97b8d5]">{label}</span>
      <span className="truncate text-right font-medium text-white">{value}</span>
    </div>
  );
}

function PanelMessage({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-fluid-base text-[#6b8198] sm:px-5">{message}</div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[0.192rem] border border-dashed border-[#dbe6ef] bg-[#fbfdff] px-4 py-4">
      <p className="text-fluid-md font-semibold text-[#173b70]">{title}</p>
      <p className="mt-1.5 text-fluid-sm leading-5 text-[#7088a1]">{body}</p>
    </div>
  );
}

export default Dashboard;

