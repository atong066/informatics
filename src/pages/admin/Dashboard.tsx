import type { ReactNode } from 'react';
import { FiArrowRight, FiBookOpen, FiLayers, FiShield, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../layout/admin/AdminLayout';
import { getFullName, useAdminOverview } from './adminData';

function AdminDashboard() {
  const navigate = useNavigate();
  const { activeUser, isError, adminOverviewQuery } = useAdminOverview();

  if (!activeUser || isError) {
    return null;
  }

  const fullName = getFullName(activeUser);
  const overview = adminOverviewQuery.data;

  return (
    <AdminLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section || 'Administration'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Admin workspace"
      pageTitle="Dashboard"
    >
      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.8rem] border border-[#c9d7db] bg-[linear-gradient(135deg,rgba(251,254,254,0.97)_0%,rgba(238,245,246,0.95)_100%)] px-5 py-5 shadow-[0_16px_30px_rgba(54,79,92,0.07)] sm:px-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f8d99]">
                Admin overview
              </p>
              <h1 className="mt-2 text-fluid-3xl font-semibold tracking-[-0.05em] text-[#173b47]">
                Keep subjects, curriculums, and section teaching loads aligned.
              </h1>
              <p className="mt-3 max-w-3xl text-fluid-sm leading-6 text-[#607c88]">
                Use the dedicated tabs to build the subject catalog, define each curriculum,
                create sections, assign advisers, and connect teachers to the subjects each section
                will actually run.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[30rem] xl:grid-cols-1">
              <QuickAction
                title="Open Subjects"
                description="Create or edit catalog entries."
                onClick={() => navigate('/admin/subjects')}
              />
              <QuickAction
                title="Open Curriculums"
                description="Choose the subjects inside each curriculum."
                onClick={() => navigate('/admin/curriculums')}
              />
              <QuickAction
                title="Open Sections"
                description="Assign advisers, curriculums, and teachers."
                onClick={() => navigate('/admin/sections')}
              />
              <QuickAction
                title="Open Students"
                description="Set course, batch, and section."
                onClick={() => navigate('/admin/students')}
              />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={<FiBookOpen className="h-5 w-5" />}
            value={String(overview?.metrics.subjectCount ?? 0)}
            label="Subjects"
          />
          <MetricCard
            icon={<FiLayers className="h-5 w-5" />}
            value={String(overview?.metrics.curriculumCount ?? 0)}
            label="Curriculums"
          />
          <MetricCard
            icon={<FiUsers className="h-5 w-5" />}
            value={String(overview?.metrics.sectionCount ?? 0)}
            label="Sections"
          />
          <MetricCard
            icon={<FiUsers className="h-5 w-5" />}
            value={String(overview?.metrics.studentCount ?? 0)}
            label="Students"
          />
          <MetricCard
            icon={<FiShield className="h-5 w-5" />}
            value={String(overview?.metrics.facultyCount ?? 0)}
            label="Faculty"
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <section className="rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
            <PanelHeader
              title="Latest curriculums"
              description="Review the newest curriculum structures and jump into editing."
              actionLabel="Manage curriculums"
              onAction={() => navigate('/admin/curriculums')}
            />

            <div className="mt-4 space-y-3">
              {adminOverviewQuery.isLoading ? (
                <EmptyState title="Loading curriculums..." description="The admin overview is being prepared." compact />
              ) : overview?.curriculums.length ? (
                overview.curriculums.slice(0, 4).map((curriculum) => (
                  <article
                    key={curriculum.id}
                    className="rounded-[1.35rem] border border-[#d4e0e4] bg-[linear-gradient(180deg,#fbfdfd_0%,#eef4f6_100%)] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                          {curriculum.title}
                        </p>
                        <p className="mt-1 text-fluid-sm text-[#67828f]">{curriculum.code}</p>
                      </div>
                      <span className="rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                        {curriculum.subjects.length} subjects
                      </span>
                    </div>
                    <p className="formatted-text mt-3 line-clamp-2 text-fluid-sm leading-6 text-[#607c88]">
                      {curriculum.description || 'No curriculum description added yet.'}
                    </p>
                    <p className="mt-3 text-fluid-xs font-medium uppercase tracking-[0.18em] text-[#7c97a2]">
                      Linked sections: {curriculum.linkedSectionCount}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No curriculums yet"
                  description="Create a curriculum tab entry once your subject catalog is ready."
                  compact
                />
              )}
            </div>
          </section>

          <section className="rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
            <PanelHeader
              title="Latest sections"
              description="These sections decide which curriculum and teacher assignments students inherit."
              actionLabel="Manage sections"
              onAction={() => navigate('/admin/sections')}
            />

            <div className="mt-4 space-y-3">
              {adminOverviewQuery.isLoading ? (
                <EmptyState title="Loading sections..." description="Section assignments are being collected." compact />
              ) : overview?.sections.length ? (
                overview.sections.slice(0, 4).map((section) => (
                  <article
                    key={section.id}
                    className="rounded-[1.35rem] border border-[#d4e0e4] bg-[linear-gradient(180deg,#fbfdfd_0%,#eef4f6_100%)] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                          {section.name}
                        </p>
                        <p className="mt-1 text-fluid-sm text-[#67828f]">
                          {section.curriculumTitle
                            ? `${section.curriculumTitle} | ${section.curriculumCode}`
                            : 'No curriculum assigned'}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                        {section.studentCount} students
                      </span>
                    </div>
                    <p className="mt-3 text-fluid-sm leading-6 text-[#607c88]">
                      Adviser: {section.adviserName || 'Not assigned yet'}
                    </p>
                    <p className="mt-2 text-fluid-xs font-medium uppercase tracking-[0.18em] text-[#7c97a2]">
                      Subject loads: {section.subjectAssignments.length}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No sections yet"
                  description="Create a section after your curriculums are ready so teachers can be assigned."
                  compact
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
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
    <article className="rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-fluid-3xl font-semibold leading-none text-[#173b47]">{value}</p>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#d8ece9_0%,#c9dfdd_100%)] text-[#1b7d71]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-fluid-sm text-[#67828f]">{label}</p>
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
      className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[#d1dde1] bg-white px-4 py-3 text-left text-[#285468] shadow-[0_10px_22px_rgba(54,79,92,0.05)] transition hover:bg-[#f8fbfb]"
    >
      <span className="min-w-0">
        <span className="block text-fluid-sm font-semibold text-[#173b47]">{title}</span>
        <span className="mt-1 block text-fluid-xs leading-5 text-[#6f8d99]">{description}</span>
      </span>
      <FiArrowRight className="h-4 w-4 shrink-0 text-[#63808d]" />
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
        <p className="text-fluid-xl font-semibold text-[#173b47]">{title}</p>
        <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
      >
        {actionLabel}
      </button>
    </div>
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

export default AdminDashboard;
