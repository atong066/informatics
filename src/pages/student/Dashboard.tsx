import StudentLayout from '../../layout/student/StudentLayout';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';

const quickStats = [
  {
    title: 'Enrolled Courses',
    value: '4',
    action: 'View all courses',
    icon: '📘',
    tone: 'blue',
  },
  {
    title: 'Pending Assignments',
    value: '3',
    action: 'View assignments',
    icon: '📝',
    tone: 'green',
  },
  {
    title: 'Upcoming Exams',
    value: '2',
    action: 'View schedule',
    icon: '📊',
    tone: 'violet',
  },
  {
    title: 'Overall Progress',
    value: '76%',
    action: 'View progress',
    icon: '⭐',
    tone: 'amber',
  },
];

const deadlineItems = [
  {
    month: 'APR',
    day: '12',
    title: 'Systems Analysis Quiz 2',
    meta: 'Apr 12, 2026 • 08:00 AM',
    badge: '2 days left',
    tone: 'blue',
  },
  {
    month: 'APR',
    day: '15',
    title: 'Case Study 02',
    meta: 'Apr 15, 2026 • 01:00 PM',
    badge: '5 days left',
    tone: 'green',
  },
  {
    month: 'APR',
    day: '18',
    title: 'Database Practical Exam',
    meta: 'Apr 18, 2026 • 10:30 AM',
    badge: '8 days left',
    tone: 'violet',
  },
  {
    month: 'APR',
    day: '22',
    title: 'Ethics Reflection Paper',
    meta: 'Apr 22, 2026 • 11:59 PM',
    badge: '12 days left',
    tone: 'amber',
  },
];

const announcements = [
  {
    title: 'Platform maintenance scheduled',
    body: 'The student portal will be under maintenance on Saturday from 1:00 AM to 3:00 AM.',
    date: 'Apr 10, 2026',
    icon: '📢',
    tone: 'blue',
  },
  {
    title: 'Final exam schedule released',
    body: 'Please review your official examination schedule in the exams module.',
    date: 'Apr 08, 2026',
    icon: '✅',
    tone: 'green',
  },
];

const courses = [
  {
    title: 'Systems Analysis',
    professor: 'Prof. Reyes',
    progress: 82,
    icon: '💾',
    tone: 'blue',
  },
  {
    title: 'Database Management',
    professor: 'Prof. Velasco',
    progress: 68,
    icon: '💻',
    tone: 'green',
  },
  {
    title: 'Project Management',
    professor: 'Prof. Javier',
    progress: 79,
    icon: '🧩',
    tone: 'violet',
  },
  {
    title: 'Web Technologies',
    professor: 'Prof. Brown',
    progress: 74,
    icon: '🌐',
    tone: 'amber',
  },
];

const performanceRows = [
  { label: 'Systems Analysis', value: 82, tone: 'blue' },
  { label: 'Database Management', value: 68, tone: 'green' },
  { label: 'Project Management', value: 79, tone: 'violet' },
  { label: 'Web Technologies', value: 74, tone: 'amber' },
];

const weeklyProgress = [48, 48, 59, 64, 64, 71, 77, 82];

const quickActions = [
  { label: 'Upload Assignment', icon: '📤', tone: 'blue' },
  { label: 'Join Live Class', icon: '🎥', tone: 'green' },
  { label: 'View Grades', icon: '📈', tone: 'violet' },
  { label: 'Academic Calendar', icon: '📅', tone: 'amber' },
];

function Dashboard() {
  const { activeUser, isError } = useCurrentStudent();

  if (!activeUser || isError) {
    return null;
  }

  const fullName = [
    activeUser.firstName,
    activeUser.middleName,
    activeUser.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <StudentLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
    >
      <div className="grid gap-[1.25rem] px-[1.4rem] py-[1.4rem] sm:px-[1.8rem] lg:px-[2rem]">
        <section className="rounded-[1.8rem] bg-[#edf3f8] px-[1.6rem] py-[1.5rem] shadow-[0_.8rem_2rem_rgba(40,68,99,0.08)] ring-[0.01rem] ring-[#d4e0ea]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-[#2f78bc]">
            Student Workspace
          </p>

          <div className="mt-[0.55rem] flex flex-col gap-[1rem] lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.05em] text-[#173b70]">
                Welcome back, {activeUser.firstName}!
              </h1>
              <p className="mt-[0.65rem] max-w-[42rem] text-[0.92rem] leading-[1.7] text-[#6b8198]">
                Here&apos;s an overview of your academic journey, upcoming requirements,
                and course performance in one clean dashboard.
              </p>
            </div>

            <div className="min-w-[16rem] self-start rounded-[1.55rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-[1.2rem] py-[1.15rem] text-white shadow-[0_1rem_2rem_rgba(27,46,70,0.18)]">
              <p className="text-[0.75rem] text-[#d5e2ef]">Account overview</p>
              <p className="mt-[0.55rem] text-[1.15rem] font-semibold leading-tight">
                {activeUser.email || 'student@nalaka.edu.ph'}
              </p>
              <p className="mt-[0.35rem] text-[0.84rem] text-[#e8eff6]">
                @{activeUser.username}
              </p>
              <p className="mt-[0.75rem] text-[0.82rem] text-[#d5e2ef]">
                Section: {activeUser.section || 'Not assigned'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-[1rem] sm:grid-cols-2 xl:grid-cols-4">
          {quickStats.map((item) => (
            <QuickStatCard key={item.title} {...item} />
          ))}
        </section>

        <section className="grid gap-[1rem] xl:grid-cols-[1.45fr_.95fr]">
          <article className="rounded-[1.8rem] bg-[#f7fbfe] p-[1.45rem] shadow-[0_.8rem_2rem_rgba(40,68,99,0.08)] ring-[0.01rem] ring-[#d7e3ed]">
            <div className="flex items-center justify-between gap-[1rem]">
              <div>
                <h2 className="text-[1.12rem] font-semibold text-[#173b70]">
                  Academic Progress
                </h2>
                <p className="mt-[0.3rem] text-[0.84rem] text-[#7288a0]">
                  Your performance trend across courses
                </p>
              </div>

              <button
                type="button"
                className="rounded-full border border-[#d3dee8] bg-white px-[1rem] py-[0.55rem] text-[0.78rem] font-semibold text-[#5d7690]"
              >
                This Semester
              </button>
            </div>

            <div className="mt-[1.2rem] rounded-[1.4rem] border border-[#dde7ef] bg-[linear-gradient(180deg,#f8fbfd_0%,#f1f6fa_100%)] p-[1rem]">
              <div className="relative h-[10.5rem]">
                <div className="absolute inset-0 grid grid-cols-8">
                  {weeklyProgress.map((_, i) => (
                    <div key={i} className="border-r border-[#e4edf4] last:border-r-0" />
                  ))}
                </div>

                <div className="absolute inset-0 grid grid-rows-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-b border-[#e4edf4] last:border-b-0" />
                  ))}
                </div>

                <div className="absolute inset-x-[3%] bottom-[18%] top-[10%] flex items-end justify-between">
                  {weeklyProgress.map((value, index) => (
                    <div
                      key={index}
                      className="flex w-[10.5%] items-end justify-center"
                    >
                      <div className="relative flex w-full items-end justify-center">
                        {index !== weeklyProgress.length - 1 && (
                          <div
                            className="absolute left-[50%] top-auto h-[0.14rem] origin-left rounded-full bg-[#3c7de0]"
                            style={{
                              width: '100%',
                              bottom: `${value}%`,
                              transform: `rotate(${Math.atan(
                                ((weeklyProgress[index + 1] - value) * 1.2) / 100
                              )}rad)`,
                            }}
                          />
                        )}
                        <div
                          className="relative z-10 w-[0.48rem] rounded-full bg-[#3c7de0]"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute inset-x-[3%] bottom-0 flex justify-between text-[0.72rem] text-[#7b8fa5]">
                  {weeklyProgress.map((_, index) => (
                    <span key={index}>Week {index + 1}</span>
                  ))}
                </div>
              </div>

              <div className="mt-[1.1rem] space-y-[0.8rem]">
                {performanceRows.map((row) => (
                  <div key={row.label}>
                    <div className="mb-[0.35rem] flex items-center justify-between gap-[1rem]">
                      <p className="text-[0.82rem] font-medium text-[#173b70]">
                        {row.label}
                      </p>
                      <p className="text-[0.8rem] font-semibold text-[#4e6782]">
                        {row.value}%
                      </p>
                    </div>

                    <div className="h-[0.38rem] rounded-full bg-[#dde8f1]">
                      <div
                        className={`h-full rounded-full ${progressTone(row.tone)}`}
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-[1.2rem] flex justify-center">
                <button
                  type="button"
                  className="text-[0.82rem] font-semibold text-[#2f78bc]"
                >
                  View detailed analytics →
                </button>
              </div>
            </div>
          </article>

          <div className="grid gap-[1rem]">
            <article className="rounded-[1.8rem] bg-[#f7fbfe] p-[1.35rem] shadow-[0_.8rem_2rem_rgba(40,68,99,0.08)] ring-[0.01rem] ring-[#d7e3ed]">
              <SectionHeader title="Upcoming Deadlines" action="View all" />
              <div className="mt-[1rem] space-y-[0.8rem]">
                {deadlineItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-[0.9rem] rounded-[1.2rem] border border-[#dde7ef] bg-white px-[0.9rem] py-[0.9rem]"
                  >
                    <div
                      className={`flex h-[3.6rem] w-[3.6rem] shrink-0 flex-col items-center justify-center rounded-[1rem] ${softTone(
                        item.tone
                      )}`}
                    >
                      <span className="text-[0.68rem] font-semibold uppercase text-[#6b8198]">
                        {item.month}
                      </span>
                      <span className="text-[1.05rem] font-semibold text-[#173b70]">
                        {item.day}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.94rem] font-semibold text-[#173b70]">
                        {item.title}
                      </p>
                      <p className="mt-[0.25rem] text-[0.77rem] text-[#7088a1]">
                        {item.meta}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-[0.7rem] py-[0.34rem] text-[0.68rem] font-semibold ${badgeTone(
                        item.tone
                      )}`}
                    >
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.8rem] bg-[#f7fbfe] p-[1.35rem] shadow-[0_.8rem_2rem_rgba(40,68,99,0.08)] ring-[0.01rem] ring-[#d7e3ed]">
              <SectionHeader title="Recent Announcements" action="View all" />
              <div className="mt-[1rem] space-y-[0.8rem]">
                {announcements.map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-[0.85rem] rounded-[1.2rem] border border-[#dde7ef] bg-white px-[0.95rem] py-[0.95rem]"
                  >
                    <div
                      className={`flex h-[2.9rem] w-[2.9rem] shrink-0 items-center justify-center rounded-[0.95rem] text-[1.05rem] ${softTone(
                        item.tone
                      )}`}
                    >
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-[1rem]">
                        <p className="text-[0.9rem] font-semibold text-[#173b70]">
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[0.72rem] text-[#8092a6]">
                          {item.date}
                        </span>
                      </div>
                      <p className="mt-[0.35rem] text-[0.78rem] leading-[1.55] text-[#7088a1]">
                        {item.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.8rem] bg-[#f7fbfe] p-[1.35rem] shadow-[0_.8rem_2rem_rgba(40,68,99,0.08)] ring-[0.01rem] ring-[#d7e3ed]">
              <h2 className="text-[1.05rem] font-semibold text-[#173b70]">
                Quick Actions
              </h2>
              <div className="mt-[1rem] grid grid-cols-2 gap-[0.75rem]">
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="rounded-[1.15rem] border border-[#dde7ef] bg-white px-[0.8rem] py-[0.95rem] text-left transition hover:-translate-y-[0.03rem]"
                  >
                    <div
                      className={`flex h-[2.7rem] w-[2.7rem] items-center justify-center rounded-[0.9rem] text-[1rem] ${softTone(
                        item.tone
                      )}`}
                    >
                      {item.icon}
                    </div>
                    <p className="mt-[0.65rem] text-[0.78rem] font-medium leading-[1.45] text-[#173b70]">
                      {item.label}
                    </p>
                  </button>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="rounded-[1.8rem] bg-[#f7fbfe] p-[1.4rem] shadow-[0_.8rem_2rem_rgba(40,68,99,0.08)] ring-[0.01rem] ring-[#d7e3ed]">
          <SectionHeader title="My Courses" action="View all courses" />
          <div className="mt-[1rem] grid gap-[0.9rem] sm:grid-cols-2 xl:grid-cols-4">
            {courses.map((course) => (
              <article
                key={course.title}
                className="rounded-[1.25rem] border border-[#dde7ef] bg-white px-[1rem] py-[1rem]"
              >
                <div
                  className={`flex h-[3rem] w-[3rem] items-center justify-center rounded-[1rem] text-[1.15rem] ${softTone(
                    course.tone
                  )}`}
                >
                  {course.icon}
                </div>

                <h3 className="mt-[0.85rem] text-[0.98rem] font-semibold leading-[1.35] text-[#173b70]">
                  {course.title}
                </h3>
                <p className="mt-[0.25rem] text-[0.78rem] text-[#7088a1]">
                  {course.professor}
                </p>

                <div className="mt-[1rem] flex items-center gap-[0.7rem]">
                  <div className="h-[0.34rem] flex-1 rounded-full bg-[#dde8f1]">
                    <div
                      className={`h-full rounded-full ${progressTone(course.tone)}`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <span className="text-[0.74rem] font-semibold text-[#4e6782]">
                    {course.progress}%
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

function QuickStatCard({
  title,
  value,
  action,
  icon,
  tone,
}: {
  title: string;
  value: string;
  action: string;
  icon: string;
  tone: string;
}) {
  return (
    <article className="rounded-[1.45rem] border border-[#d9e4ed] bg-[linear-gradient(180deg,#f9fcfe_0%,#f2f7fb_100%)] px-[1.15rem] py-[1.1rem] shadow-[0_.6rem_1.5rem_rgba(40,68,99,0.06)]">
      <div className="flex items-start justify-between gap-[0.8rem]">
        <div
          className={`flex h-[3.05rem] w-[3.05rem] items-center justify-center rounded-[1rem] text-[1.1rem] ${softTone(
            tone
          )}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-[0.8rem] text-[0.9rem] font-medium text-[#5f7892]">{title}</p>
      <p className="mt-[0.3rem] text-[2rem] font-semibold leading-none text-[#173b70]">
        {value}
      </p>
      <button
        type="button"
        className="mt-[0.85rem] text-[0.8rem] font-semibold text-[#2f78bc]"
      >
        {action} →
      </button>
    </article>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action: string;
}) {
  return (
    <div className="flex items-center justify-between gap-[1rem]">
      <h2 className="text-[1.08rem] font-semibold text-[#173b70]">{title}</h2>
      <button
        type="button"
        className="text-[0.8rem] font-semibold text-[#2f78bc]"
      >
        {action}
      </button>
    </div>
  );
}

function softTone(tone: string) {
  switch (tone) {
    case 'blue':
      return 'bg-[#e8f1ff] text-[#2f78bc]';
    case 'green':
      return 'bg-[#e7f7ef] text-[#2f9b63]';
    case 'violet':
      return 'bg-[#f1ebff] text-[#8b5fe0]';
    case 'amber':
      return 'bg-[#fff2e2] text-[#f29a2e]';
    default:
      return 'bg-[#eef3f8] text-[#5d7690]';
  }
}

function badgeTone(tone: string) {
  switch (tone) {
    case 'blue':
      return 'bg-[#e8f1ff] text-[#2f78bc]';
    case 'green':
      return 'bg-[#e7f7ef] text-[#2f9b63]';
    case 'violet':
      return 'bg-[#f1ebff] text-[#8b5fe0]';
    case 'amber':
      return 'bg-[#fff2e2] text-[#f29a2e]';
    default:
      return 'bg-[#eef3f8] text-[#5d7690]';
  }
}

function progressTone(tone: string) {
  switch (tone) {
    case 'blue':
      return 'bg-[#3c7de0]';
    case 'green':
      return 'bg-[#2f9b63]';
    case 'violet':
      return 'bg-[#8b5fe0]';
    case 'amber':
      return 'bg-[#f29a2e]';
    default:
      return 'bg-[#7d94aa]';
  }
}

export default Dashboard;