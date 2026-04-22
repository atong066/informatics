import { FiBriefcase, FiLogOut, FiShield } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import { clearStoredUser } from '../../lib/auth';

function StaffDashboard() {
  const navigate = useNavigate();
  const { activeUser, isError } = useCurrentStudent();

  if (!activeUser || isError) {
    return null;
  }

  const fullName = [activeUser.firstName, activeUser.middleName, activeUser.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8f5_0%,#e5eee7_100%)] px-5 py-6 text-[#183b25] sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-col gap-4 rounded-[0.24rem] border border-[#c8d7ca] bg-white px-5 py-5 shadow-[0_16px_30px_rgba(58,88,64,0.07)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] text-white">
              <FiBriefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#718f76]">
                Staff portal
              </p>
              <h1 className="text-fluid-xl font-semibold tracking-[-0.04em] text-[#183b25]">
                {fullName}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearStoredUser();
              navigate('/login', { replace: true });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#cfe0d2] bg-[#f8fbf8] px-4 py-2.5 text-fluid-sm font-semibold text-[#587a60] transition hover:bg-white"
          >
            <FiLogOut className="h-4 w-4" />
            Sign out
          </button>
        </header>

        <section className="mt-5 rounded-[0.24rem] border border-[#c8d7ca] bg-white px-5 py-5 shadow-[0_16px_30px_rgba(58,88,64,0.07)]">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3ea] text-[#2f8a52]">
              <FiShield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-fluid-lg font-semibold text-[#183b25]">Employment profile</p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">
                HR manages onboarding, payroll, and employee records. Contact HR if any detail
                below needs to be updated.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProfileItem label="Employee number" value={activeUser.employeeNumber || 'Not set'} />
            <ProfileItem label="Department" value={activeUser.department || activeUser.section || 'Not set'} />
            <ProfileItem label="Position" value={activeUser.position || 'Staff'} />
            <ProfileItem label="Status" value={activeUser.employmentStatus || 'active'} />
            <ProfileItem label="Hire date" value={activeUser.hireDate || 'Not set'} />
            <ProfileItem label="Pay schedule" value={activeUser.paySchedule || 'monthly'} />
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[0.16rem] border border-[#d5e1d7] bg-[#f8fbf8] px-4 py-4">
      <p className="text-fluid-3xs font-semibold uppercase tracking-[0.18em] text-[#718f76]">
        {label}
      </p>
      <p className="mt-2 break-words text-fluid-md font-semibold capitalize text-[#183b25]">
        {value}
      </p>
    </div>
  );
}

export default StaffDashboard;
