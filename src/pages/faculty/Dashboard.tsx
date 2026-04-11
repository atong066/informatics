import type { ReactNode } from 'react';
import { FiBookOpen, FiClipboard, FiClock, FiUsers } from 'react-icons/fi';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import FacultyLayout from '../../layout/faculty/FacultyLayout';

function FacultyDashboard() {
  const { activeUser, isError } = useCurrentStudent();

  if (!activeUser || isError) {
    return null;
  }

  const fullName = [activeUser.firstName, activeUser.middleName, activeUser.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Faculty workspace"
      pageTitle="Dashboard"
    >
      <div className="mx-auto max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[#c9d5e0] bg-[linear-gradient(135deg,rgba(251,253,255,0.96)_0%,rgba(238,244,249,0.94)_100%)] px-6 py-6 shadow-[0_18px_34px_rgba(49,70,98,0.08)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
                Today
              </p>
              <h1 className="mt-3 max-w-3xl text-[2rem] font-semibold tracking-[-0.05em] text-[#173b70]">
                Welcome back, {activeUser.firstName}. Your classes, reviews, and faculty tasks are lined up.
              </h1>
              <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[#607b97]">
                Use this workspace to track sections, prepare your timetable, and keep up with advising work.
              </p>
            </div>

            <div className="min-w-[260px] rounded-[1.75rem] bg-[linear-gradient(180deg,#2d4c70_0%,#365a81_100%)] px-5 py-5 text-white shadow-[0_18px_30px_rgba(24,46,74,0.22)]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#bfd3e8]">Next block</p>
              <p className="mt-3 text-[1.35rem] font-semibold tracking-[-0.04em]">
                Systems Analysis
              </p>
              <p className="mt-2 text-[13px] text-[#d4e2ef]">10:00 AM to 11:30 AM</p>
              <p className="mt-1 text-[13px] text-[#d4e2ef]">BSIT 2B • Lab 402</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<FiUsers className="h-5 w-5" />} value="4" label="Active sections" />
          <MetricCard icon={<FiBookOpen className="h-5 w-5" />} value="6" label="Subjects handled" />
          <MetricCard icon={<FiClipboard className="h-5 w-5" />} value="18" label="Pending reviews" />
          <MetricCard icon={<FiClock className="h-5 w-5" />} value="3" label="Today's classes" />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.9rem] border border-[#c9d5e0] bg-[rgba(251,253,255,0.9)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.06)] sm:p-6">
            <PanelHeader title="Teaching schedule" action="View timetable" />
            <div className="mt-4 space-y-3">
              {[
                ['08:00 - 09:30', 'Database Management', 'BSIS 3A | Room 305'],
                ['10:00 - 11:30', 'Systems Analysis', 'BSIT 2B | Lab 402'],
                ['13:00 - 14:30', 'Capstone Advising', 'Project group consultation'],
              ].map(([time, title, detail]) => (
                <div
                  key={`${time}-${title}`}
                  className="rounded-[1.4rem] border border-[#dce5ed] bg-[#f8fbfd] px-4 py-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[1rem] font-semibold text-[#123b74]">{title}</p>
                      <p className="mt-1 text-[13px] text-[#7088a1]">{detail}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#2b79ba]">{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.9rem] border border-[#c9d5e0] bg-[rgba(251,253,255,0.9)] p-5 shadow-[0_16px_30px_rgba(49,70,98,0.06)] sm:p-6">
            <PanelHeader title="Faculty notes" action="Open inbox" />
            <div className="mt-4 space-y-3">
              {[
                'Two grade sheets are waiting for final review.',
                'Advising block opens at 1:00 PM for capstone students.',
                'Faculty meeting scheduled for Friday at 4:00 PM.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.4rem] border border-[#dce5ed] bg-[#f8fbfd] px-4 py-4 text-[14px] leading-6 text-[#48617d]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </FacultyLayout>
  );
}

function MetricCard({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#c9d5e0] bg-[rgba(251,253,255,0.92)] p-5 shadow-[0_14px_28px_rgba(49,70,98,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[2rem] font-semibold leading-none text-[#123b74]">{value}</p>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#dde9f6_0%,#cadcf0_100%)] text-[#2b79ba]">
          {icon}
        </div>
      </div>
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
        className="rounded-full border border-[#c9d8e6] bg-[#f7fbfe] px-4 py-2 text-[13px] font-semibold text-[#2b79ba]"
      >
        {action}
      </button>
    </div>
  );
}

export default FacultyDashboard;
