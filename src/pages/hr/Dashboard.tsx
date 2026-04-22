import type { ReactNode } from 'react';
import { FiArrowRight, FiClipboard, FiDollarSign, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import HRLayout from '../../layout/hr/HRLayout';
import { formatCurrency, formatDate, getFullName, useHrOverview } from './hrData';

function HrDashboard() {
  const navigate = useNavigate();
  const { activeUser, isError, hrOverviewQuery } = useHrOverview();

  if (!activeUser || isError) {
    return null;
  }

  const fullName = getFullName(activeUser);
  const overview = hrOverviewQuery.data;
  const onboardingPlans = overview?.onboardingPlans ?? [];
  const payrollRecords = overview?.payrollRecords ?? [];

  return (
    <HRLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.department || activeUser.section || 'Human Resources'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageTitle="Dashboard"
    >
      <div className="mx-auto w-full max-w-[15.68rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[0.24rem] border border-[#c8d7ca] bg-[linear-gradient(135deg,rgba(252,254,252,0.98)_0%,rgba(237,245,239,0.96)_100%)] px-5 py-5 shadow-[0_16px_30px_rgba(58,88,64,0.07)] sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#718f76]">
                HR command center
              </p>
              <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.04em] text-[#183b25]">
                Track hiring, onboarding, and payroll without leaving the workforce record.
              </h1>
              <p className="mt-3 max-w-3xl text-fluid-sm leading-6 text-[#607965]">
                Create faculty or staff accounts, follow onboarding tasks, and keep payroll cycles
                ready for review from one operational workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[4.8rem] xl:grid-cols-1">
              <QuickAction
                title="Add employee"
                description="Create faculty or staff accounts."
                onClick={() => navigate('/hr/workforce')}
              />
              <QuickAction
                title="Review onboarding"
                description="Complete pending employee tasks."
                onClick={() => navigate('/hr/onboarding')}
              />
              <QuickAction
                title="Open payroll"
                description="Prepare pay periods and statuses."
                onClick={() => navigate('/hr/payroll')}
              />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<FiUsers className="h-5 w-5" />}
            value={String(overview?.metrics.employeeCount ?? 0)}
            label="Employees"
          />
          <MetricCard
            icon={<FiUsers className="h-5 w-5" />}
            value={String(overview?.metrics.facultyCount ?? 0)}
            label="Faculty"
          />
          <MetricCard
            icon={<FiClipboard className="h-5 w-5" />}
            value={String(overview?.metrics.onboardingCount ?? 0)}
            label="Onboarding"
          />
          <MetricCard
            icon={<FiDollarSign className="h-5 w-5" />}
            value={String(overview?.metrics.pendingPayrollCount ?? 0)}
            label="Payroll open"
          />
          <MetricCard
            icon={<FiTrendingUp className="h-5 w-5" />}
            value={formatCurrency(overview?.metrics.payrollThisMonth ?? 0)}
            label="This month"
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <section className="rounded-[0.232rem] border border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] p-5 shadow-[0_14px_28px_rgba(58,88,64,0.06)]">
            <PanelHeader
              title="Onboarding queue"
              description="The closest active onboarding plans across faculty and staff."
              actionLabel="Manage onboarding"
              onAction={() => navigate('/hr/onboarding')}
            />

            <div className="mt-4 space-y-3">
              {hrOverviewQuery.isLoading ? (
                <EmptyState title="Loading onboarding..." description="Plans are being prepared." />
              ) : onboardingPlans.length ? (
                onboardingPlans.slice(0, 4).map((plan) => (
                  <article
                    key={plan.id}
                    className="rounded-[0.184rem] border border-[#d5e1d7] bg-[linear-gradient(180deg,#fbfdfb_0%,#eef6f0_100%)] px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-fluid-md font-semibold text-[#183b25]">
                          {plan.employeeName}
                        </p>
                        <p className="mt-1 text-fluid-sm text-[#6b866f]">
                          {plan.department} | {plan.employeeRole}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#cfe0d2] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#587a60]">
                        {plan.completedTaskCount}/{plan.taskCount} tasks
                      </span>
                    </div>
                    <p className="mt-3 text-fluid-sm leading-6 text-[#607965]">
                      Due: {formatDate(plan.dueDate)}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState title="No onboarding plans" description="Create an employee to start onboarding." />
              )}
            </div>
          </section>

          <section className="rounded-[0.232rem] border border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] p-5 shadow-[0_14px_28px_rgba(58,88,64,0.06)]">
            <PanelHeader
              title="Payroll status"
              description="Recent pay periods and processing state."
              actionLabel="Manage payroll"
              onAction={() => navigate('/hr/payroll')}
            />

            <div className="mt-4 space-y-3">
              {hrOverviewQuery.isLoading ? (
                <EmptyState title="Loading payroll..." description="Payroll records are being collected." />
              ) : payrollRecords.length ? (
                payrollRecords.slice(0, 4).map((record) => (
                  <article
                    key={record.id}
                    className="rounded-[0.184rem] border border-[#d5e1d7] bg-[linear-gradient(180deg,#fbfdfb_0%,#eef6f0_100%)] px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-fluid-md font-semibold text-[#183b25]">
                          {record.employeeName}
                        </p>
                        <p className="mt-1 text-fluid-sm text-[#6b866f]">
                          {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#cfe0d2] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#587a60]">
                        {record.status}
                      </span>
                    </div>
                    <p className="mt-3 text-fluid-sm font-semibold text-[#315d43]">
                      Net pay: {formatCurrency(record.netPay)}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState title="No payroll records" description="Create a pay period when payroll is ready." />
              )}
            </div>
          </section>
        </div>
      </div>
    </HRLayout>
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
    <article className="rounded-[0.232rem] border border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] p-5 shadow-[0_14px_28px_rgba(58,88,64,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="break-words text-fluid-2xl font-semibold leading-tight text-[#183b25]">{value}</p>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#dcefe1_0%,#cfe4d4_100%)] text-[#2f8a52]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-fluid-sm text-[#6b866f]">{label}</p>
    </article>
  );
}

function QuickAction({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-[0.16rem] border border-[#cfe0d2] bg-white px-4 py-3 text-left text-[#315d43] shadow-[0_10px_22px_rgba(58,88,64,0.05)] transition hover:bg-[#f8fbf8]"
    >
      <span className="min-w-0">
        <span className="block text-fluid-sm font-semibold text-[#183b25]">{title}</span>
        <span className="mt-1 block text-fluid-xs leading-5 text-[#718f76]">{description}</span>
      </span>
      <FiArrowRight className="h-4 w-4 shrink-0 text-[#6b866f]" />
    </button>
  );
}

function PanelHeader({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-fluid-xl font-semibold text-[#183b25]">{title}</p>
        <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#cfe0d2] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#587a60] transition hover:bg-[#f8fbf8]"
      >
        {actionLabel}
      </button>
    </div>
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
    <div className="rounded-[0.184rem] border border-dashed border-[#d5e1d7] bg-[linear-gradient(180deg,#fbfdfb_0%,#eef6f0_100%)] px-5 py-7 text-center">
      <p className="text-fluid-md font-semibold text-[#183b25]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">{description}</p>
    </div>
  );
}

export default HrDashboard;
