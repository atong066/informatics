import StudentLayout from '../../layout/student/StudentLayout';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';

const subjectCards = [
  {
    title: 'Systems Analysis and Design',
    detail: 'IS 312 - Michael Reyes',
    status: 'Excellent',
  },
  {
    title: 'Database Management',
    detail: 'IS 305 - Ariana Velasco',
    status: 'On track',
  },
  {
    title: 'Systems Project Management',
    detail: 'IS 330 - Bryan Javier',
    status: 'On track',
  },
  {
    title: 'Ethics',
    detail: 'GE 208 - Camila Dizon',
    status: 'Needs attention',
  },
];

const assessments = [
  {
    title: 'Quiz 2 - Systems Review',
    detail: 'Systems Analysis and Design - 2nd Quarter',
    schedule: '2026-04-12 - 08:00',
  },
  {
    title: 'Case Study 02',
    detail: 'Systems Analysis and Design - 2nd Quarter',
    schedule: '2026-04-15 - 13:00',
  },
];

const gradeCards = [
  { subject: 'Systems Analysis', score: '89', note: 'Excellent' },
  { subject: 'Database Management', score: '86', note: 'On track' },
  { subject: 'Project Management', score: '88', note: 'Good' },
  { subject: 'Ethics', score: '82', note: 'Needs review' },
];

const todaySchedule = [
  {
    time: '08:00 - 09:30',
    subject: 'Systems Analysis and Design',
    room: 'Lab 402',
    status: 'Next class',
  },
  {
    time: '10:00 - 11:30',
    subject: 'Database Management',
    room: 'Room 305',
    status: 'Lecture',
  },
  {
    time: '13:00 - 14:30',
    subject: 'Web Programming',
    room: 'Lab 205',
    status: 'Lab',
  },
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
      <div className="grid gap-5 px-4 py-5 sm:px-7 lg:px-8">
        <article className="rounded-[2rem] border border-[#b8cddd] bg-[linear-gradient(120deg,#eef4f9_0%,#e4edf5_38%,#dde7f0_100%)] px-5 py-6 shadow-[0_18px_34px_rgba(49,70,98,0.1)] sm:px-6">
          <div className="grid gap-5 xl:grid-cols-[1fr_275px]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#2b79ba]">
                Today
              </p>
              <h2 className="mt-3 max-w-4xl text-[2.1rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[#173b70] sm:text-[2.55rem]">
                Keep your subjects, assessments, and schedule aligned from one student view.
              </h2>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#5f7896]">
                Your portal is read-focused by default, with direct paths into grades,
                upcoming work, and schedule checks.
              </p>
            </div>

            <div className="self-start rounded-[1.7rem] bg-[linear-gradient(180deg,#365678_0%,#284463_100%)] px-5 py-5 text-white shadow-[0_20px_32px_rgba(27,46,70,0.2)]">
              <p className="text-[12px] text-[#d2dfec]">Next assessment</p>
              <p className="mt-3 text-[1.3rem] font-semibold leading-tight">
                Quiz 2 - Systems Review
              </p>
              <p className="mt-4 text-[15px] text-[#e8eff6]">2026-04-12 - 08:00</p>
            </div>
          </div>
        </article>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard value="4" label="Active subjects" />
          <StatCard value="87.5" label="General average" />
          <StatCard value="2" label="Open assessments" />
          <StatCard value="3" label="Friday blocks" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
            <PanelHeader title="My Subjects" action="View all" />
            <div className="mt-4 space-y-3">
              {subjectCards.map((item) => (
                <div
                  key={item.title}
                  className="grid gap-3 rounded-[1.45rem] border border-[#d3dee8] bg-[#f8fbfd] px-4 py-4 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-[1.02rem] font-semibold text-[#123b74]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[13px] text-[#7088a1]">{item.detail}</p>
                  </div>
                  <div className="justify-self-start text-[13px] italic text-[#36557a] md:justify-self-end">
                    {item.status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
            <PanelHeader title="Assessment Queue" action="Open assessments" />
            <div className="mt-4 space-y-3">
              {assessments.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.45rem] border border-[#d3dee8] bg-[#f8fbfd] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[1rem] font-semibold text-[#123b74]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-[13px] text-[#7088a1]">{item.detail}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="inline-flex rounded-full bg-[#d2e1ec] px-3 py-1 text-[11px] font-semibold text-[#2b79ba]">
                        Open
                      </span>
                      <p className="mt-3 text-[13px] text-[#7088a1]">{item.schedule}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
            <PanelHeader title="My Grades" action="Grade details" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {gradeCards.map((item) => (
                <div
                  key={item.subject}
                  className="rounded-[1.4rem] border border-[#d3dee8] bg-[#f8fbfd] px-4 py-4"
                >
                  <p className="text-sm font-semibold text-[#123b74]">{item.subject}</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-[1.85rem] font-semibold leading-none text-[#123b74]">
                      {item.score}
                    </p>
                    <p className="text-[12px] text-[#7088a1]">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-[#bfcedd] bg-[linear-gradient(180deg,#f3f7fb_0%,#edf3f8_100%)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.08)] sm:p-6">
            <PanelHeader title="Today's Schedule" action="Full schedule" />
            <div className="mt-4 space-y-3">
              {todaySchedule.map((item) => (
                <div
                  key={`${item.subject}-${item.time}`}
                  className="rounded-[1.45rem] border border-[#d3dee8] bg-[#f8fbfd] px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[1rem] font-semibold text-[#123b74]">
                        {item.subject}
                      </p>
                      <p className="mt-1 text-[13px] text-[#7088a1]">{item.room}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-[#123b74]">{item.time}</p>
                      <p className="mt-1 text-[12px] text-[#7088a1]">{item.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </StudentLayout>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <article className="rounded-[1.75rem] border border-[#c4d5e4] bg-[linear-gradient(180deg,#f4f8fb_0%,#eef4f8_100%)] p-5 shadow-[0_16px_32px_rgba(49,70,98,0.08)]">
      <p className="text-[2.35rem] font-semibold leading-none text-[#123b74]">{value}</p>
      <p className="mt-3 text-[13px] text-[#7088a1]">{label}</p>
    </article>
  );
}

function PanelHeader({ title, action }: { title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[1.12rem] font-semibold text-[#123b74]">{title}</p>
      <button
        type="button"
        className="rounded-full border border-[#c4d5e4] bg-[#f5f9fc] px-4 py-2 text-[13px] font-semibold text-[#2b79ba] shadow-[0_6px_16px_rgba(49,70,98,0.06)]"
      >
        {action}
      </button>
    </div>
  );
}

export default Dashboard;
