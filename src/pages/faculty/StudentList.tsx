import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEye,
  FiMail,
  FiPhone,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import { getStoredToken } from '../../lib/auth';

type StudentListItem = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  address: string;
  email: string;
  username: string;
  section: string;
  contactNumber: string;
  birthdate: string;
  status: string;
  profileImage?: string | null;
};

const PAGE_SIZE = 8;

function formatBirthdate(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value || 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function exportStudentsToCsv(rows: StudentListItem[]) {
  const headers = ['Name', 'Email', 'Username', 'Section', 'Contact Number', 'Birthdate', 'Status'];
  const csvRows = rows.map((student) => [
    student.fullName,
    student.email,
    student.username,
    student.section,
    student.contactNumber,
    student.birthdate,
    student.status,
  ]);

  const csvContent = [headers, ...csvRows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', 'faculty-student-list.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getInitials(student: StudentListItem) {
  return [student.firstName, student.lastName]
    .filter(Boolean)
    .map((value) => value[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
}

function FacultyStudentList() {
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const [searchValue, setSearchValue] = useState('');
  const [selectedSection, setSelectedSection] = useState('All sections');
  const [selectedStatus, setSelectedStatus] = useState('All status');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['faculty-students'],
    queryFn: async () => {
      const response = await fetch('/api/faculty/students', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await response.json()) as {
        message?: string;
        data?: StudentListItem[];
      };

      if (!response.ok || !data.data) {
        throw new Error(data.message || 'Failed to load student list');
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

  const sectionOptions = useMemo(() => {
    const sections = new Set(
      (studentsQuery.data ?? []).map((student) => student.section).filter(Boolean),
    );

    return ['All sections', ...Array.from(sections).sort((a, b) => a.localeCompare(b))];
  }, [studentsQuery.data]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return (studentsQuery.data ?? []).filter((student) => {
      const matchesSearch =
        normalizedSearch.length === 0
        || [
          student.fullName,
          student.email,
          student.username,
          student.section,
          student.contactNumber,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      const matchesSection =
        selectedSection === 'All sections' || student.section === selectedSection;

      const matchesStatus =
        selectedStatus === 'All status' || student.status === selectedStatus;

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [searchValue, selectedSection, selectedStatus, studentsQuery.data]);

  const counts = useMemo(() => {
    const allStudents = studentsQuery.data ?? [];

    return {
      total: allStudents.length,
      active: allStudents.filter((student) => student.status === 'Active').length,
      followUp: allStudents.filter((student) => student.status !== 'Active').length,
      filtered: filteredStudents.length,
    };
  }, [filteredStudents.length, studentsQuery.data]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, pageCount);
  const paginatedStudents = filteredStudents.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE,
  );
  const startEntry = filteredStudents.length === 0 ? 0 : (currentPageSafe - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(currentPageSafe * PAGE_SIZE, filteredStudents.length);

  const visiblePages = useMemo(() => {
    const allPages = Array.from({ length: pageCount }, (_, index) => index + 1);

    if (pageCount <= 5) {
      return allPages;
    }

    const start = Math.max(1, Math.min(currentPageSafe - 2, pageCount - 4));
    return allPages.slice(start - 1, start + 4);
  }, [currentPageSafe, pageCount]);

  if (!activeUser || isError) {
    return null;
  }

  return (
    <FacultyLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.section}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Student management"
      pageTitle="Student List"
    >
      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.9rem] border border-[#b2c3d1] bg-[linear-gradient(180deg,rgba(209,220,231,0.95)_0%,rgba(197,209,223,0.93)_100%)] shadow-[0_14px_32px_rgba(27,46,70,0.09)]">
          <div className="border-b border-[#bfcedb] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f89a4]">
                    Student Directory
                  </p>
                  <h2 className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-[#173b70]">
                    Review active students and follow-up records.
                  </h2>
                  <p className="mt-2 text-[0.86rem] leading-6 text-[#5f7893]">
                    Filter by section or status, search individual records, and export the
                    current result set without leaving the workspace.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <ToolbarMetric label="Total" value={String(counts.total)} />
                  <ToolbarMetric label="Active" value={String(counts.active)} />
                  <ToolbarMetric label="Needs follow-up" value={String(counts.followUp)} />
                  <ToolbarMetric label="Showing" value={String(counts.filtered)} />
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_220px_minmax(0,1fr)] xl:items-end">
                  <FilterShell label="Section">
                    <CustomSelect
                      id="faculty-student-section-filter"
                      options={sectionOptions}
                      placeholder="All sections"
                      value={selectedSection}
                      onChange={(value) => {
                        setSelectedSection(value);
                        setCurrentPage(1);
                      }}
                      tone="muted"
                    />
                  </FilterShell>

                  <FilterShell label="Status">
                    <CustomSelect
                      id="faculty-student-status-filter"
                      options={['All status', 'Active', 'Incomplete docs']}
                      placeholder="All status"
                      value={selectedStatus}
                      onChange={(value) => {
                        setSelectedStatus(value);
                        setCurrentPage(1);
                      }}
                      tone="muted"
                    />
                  </FilterShell>

                  <label className="flex min-w-0 items-center gap-3 rounded-[1.05rem] border border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] px-4 py-2.5 text-[#6f89a4] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] xl:translate-y-[1px]">
                    <FiSearch className="h-4 w-4 shrink-0" />
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(event) => {
                        setSearchValue(event.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search student, email, username, section"
                      className="w-full bg-transparent text-[14px] text-[#25456d] outline-none placeholder:text-[#7b93aa]"
                    />
                  </label>
                </div>

                <div className="flex items-end justify-start xl:justify-end">
                  <button
                    type="button"
                    onClick={() => exportStudentsToCsv(filteredStudents)}
                    disabled={filteredStudents.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] px-4 py-3 text-[14px] font-semibold text-[#31567f] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-[rgba(217,227,236,0.98)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <FiDownload className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="overflow-hidden rounded-[1.45rem] border border-[#b7c8d7] bg-[rgba(197,209,222,0.42)]">
              <div className="overflow-x-auto">
                <table className="min-w-[1040px] w-full border-collapse">
                  <thead className="bg-[rgba(185,199,214,0.5)]">
                    <tr className="text-left">
                      <th className="w-14 px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label="Select all students"
                          className="h-4 w-4 rounded border border-[#9eb2c6] accent-[#4b89c6]"
                        />
                      </th>
                      <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Student
                      </th>
                      <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Section
                      </th>
                      <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Username
                      </th>
                      <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Status
                      </th>
                      <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Birthdate
                      </th>
                      <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Contact
                      </th>
                      <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-[#617d99]">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#c4d2de] bg-[rgba(214,224,234,0.68)]">
                    {studentsQuery.isLoading ? (
                      <TableMessageRow
                        message="Loading student records..."
                        icon={<FiUsers className="h-4 w-4" />}
                      />
                    ) : studentsQuery.isError ? (
                      <TableMessageRow
                        message="Failed to load the student list."
                        icon={<FiAlertCircle className="h-4 w-4" />}
                        tone="error"
                      />
                    ) : paginatedStudents.length > 0 ? (
                      paginatedStudents.map((student) => (
                        <tr key={student.id} className="transition hover:bg-[rgba(223,231,239,0.82)]">
                          <td className="px-4 py-4 align-middle">
                            <input
                              type="checkbox"
                              aria-label={`Select ${student.fullName}`}
                              className="h-4 w-4 rounded border border-[#9eb2c6] accent-[#4b89c6]"
                            />
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              {student.profileImage ? (
                                <img
                                  src={student.profileImage}
                                  alt={`${student.fullName} profile`}
                                  className="h-11 w-11 rounded-full border border-[#b6c7d6] object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#b6c7d6] bg-[linear-gradient(180deg,#cfdeeb_0%,#c2d4e3_100%)] text-[13px] font-semibold text-[#315c90]">
                                  {getInitials(student)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-[#163d73]">
                                  {student.fullName}
                                </p>
                                <p className="truncate text-[13px] text-[#6f88a3]">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle text-[14px] font-medium text-[#45627f]">
                            {student.section || 'Not set'}
                          </td>
                          <td className="px-4 py-4 align-middle text-[14px] text-[#45627f]">
                            @{student.username}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold ${
                                student.status === 'Active'
                                  ? 'border-[#a8d8c0] bg-[rgba(209,231,218,0.92)] text-[#116745]'
                                  : 'border-[#d9c19d] bg-[rgba(230,220,201,0.92)] text-[#956018]'
                              }`}
                            >
                              {student.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-middle text-[14px] text-[#5d7692]">
                            {formatBirthdate(student.birthdate)}
                          </td>
                          <td className="px-4 py-4 align-middle text-[14px] text-[#5d7692]">
                            {student.contactNumber || 'Not set'}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center justify-end gap-2">
                              <ActionIcon
                                label={`Preview ${student.fullName}`}
                                icon={<FiEye className="h-4 w-4" />}
                                onClick={() => setSelectedStudent(student)}
                              />
                              <ActionIcon
                                as="a"
                                href={`mailto:${student.email}`}
                                label={`Email ${student.fullName}`}
                                icon={<FiMail className="h-4 w-4" />}
                              />
                              <ActionIcon
                                as="a"
                                href={student.contactNumber ? `tel:${student.contactNumber}` : undefined}
                                label={`Call ${student.fullName}`}
                                icon={<FiPhone className="h-4 w-4" />}
                                tone="accent"
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <TableMessageRow
                        message="No students matched the current filters."
                        icon={<FiUsers className="h-4 w-4" />}
                      />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#bfcedb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#617c99]">
              <span className="rounded-full border border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] px-3 py-1">
                {startEntry}-{endEntry} of {filteredStudents.length}
              </span>
              <span className="rounded-full border border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] px-3 py-1">
                Page {currentPageSafe} of {pageCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPageSafe === 1}
                className="inline-flex h-10 items-center gap-2 rounded-[0.95rem] border border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] px-3 text-[14px] font-medium text-[#5b7490] transition hover:bg-[rgba(218,227,236,0.98)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" />
                Prev
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-10 min-w-10 rounded-[0.95rem] border px-3 text-[14px] font-medium transition ${
                    page === currentPageSafe
                      ? 'border-[#4a89c6] bg-[#4a89c6] text-white shadow-[0_8px_18px_rgba(53,110,170,0.18)]'
                      : 'border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] text-[#4e6883] hover:bg-[rgba(218,227,236,0.98)]'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={currentPageSafe === pageCount}
                className="inline-flex h-10 items-center gap-2 rounded-[0.95rem] border border-[#b7c8d7] bg-[rgba(209,220,231,0.96)] px-3 text-[14px] font-medium text-[#5b7490] transition hover:bg-[rgba(218,227,236,0.98)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(selectedStudent)}
        title={selectedStudent?.fullName ?? 'Student details'}
        description="Review the selected student's academic and contact information."
        onClose={() => setSelectedStudent(null)}
        actions={
          selectedStudent ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="rounded-2xl border border-[#b7c7d6] bg-[rgba(209,220,231,0.96)] px-4 py-2.5 text-[14px] font-semibold text-[#48617d] transition hover:bg-[rgba(217,227,236,0.98)]"
              >
                Close
              </button>
              <a
                href={`mailto:${selectedStudent.email}`}
                className="rounded-2xl border border-[#6eaad9] bg-[linear-gradient(180deg,#3f92de_0%,#297cc6_100%)] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105"
              >
                Email student
              </a>
            </>
          ) : null
        }
      >
        {selectedStudent ? (
          <div className="space-y-5">
            <div className="flex items-start gap-4 rounded-[1.3rem] border border-[#b7c8d7] bg-[rgba(209,220,231,0.72)] px-4 py-4">
              {selectedStudent.profileImage ? (
                <img
                  src={selectedStudent.profileImage}
                  alt={`${selectedStudent.fullName} profile`}
                  className="h-16 w-16 rounded-full border border-[#b6c7d6] object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#b6c7d6] bg-[linear-gradient(180deg,#cfdeeb_0%,#c2d4e3_100%)] text-[1rem] font-semibold text-[#315c90]">
                  {getInitials(selectedStudent)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[1.02rem] font-semibold text-[#173b70]">
                    {selectedStudent.fullName}
                  </p>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[12px] font-semibold ${
                      selectedStudent.status === 'Active'
                        ? 'border-[#a8d8c0] bg-[rgba(209,231,218,0.92)] text-[#116745]'
                        : 'border-[#d9c19d] bg-[rgba(230,220,201,0.92)] text-[#956018]'
                    }`}
                  >
                    {selectedStudent.status}
                  </span>
                </div>
                <p className="mt-1 text-[0.84rem] text-[#5f7893]">
                  @{selectedStudent.username}
                </p>
                <p className="mt-2 text-[0.84rem] text-[#5f7893]">
                  Section: {selectedStudent.section || 'Not set'}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard
                label="Email"
                value={selectedStudent.email || 'Not set'}
              />
              <DetailCard
                label="Contact number"
                value={selectedStudent.contactNumber || 'Not set'}
              />
              <DetailCard
                label="Birthdate"
                value={formatBirthdate(selectedStudent.birthdate)}
              />
              <DetailCard
                label="Address"
                value={selectedStudent.address || 'Not set'}
                fullWidth
              />
              <DetailCard
                label="Username"
                value={`@${selectedStudent.username}`}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </FacultyLayout>
  );
}

function ToolbarMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-[#b7c8d7] bg-[rgba(209,220,231,0.92)] px-3.5 py-2 text-[#173b70] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#6f89a4]">
        {label}
      </span>
      <span className="ml-2 text-[0.88rem] font-semibold">{value}</span>
    </div>
  );
}

function FilterShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.05rem] border border-[#b7c8d7] bg-[rgba(204,216,228,0.74)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f89a4]">
        {label}
      </p>
      {children}
    </div>
  );
}

function TableMessageRow({
  message,
  icon,
  tone = 'default',
}: {
  message: string;
  icon: React.ReactNode;
  tone?: 'default' | 'error';
}) {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-14">
        <div
          className={`flex items-center justify-center gap-3 text-[14px] ${
            tone === 'error' ? 'text-rose-700' : 'text-[#5f7893]'
          }`}
        >
          {icon}
          {message}
        </div>
      </td>
    </tr>
  );
}

function ActionIcon({
  label,
  icon,
  as = 'button',
  href,
  tone = 'default',
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
  tone?: 'default' | 'accent';
  onClick?: () => void;
}) {
  const className = `flex h-9 w-9 items-center justify-center rounded-[0.9rem] border transition ${
    tone === 'accent'
      ? 'border-[#c7bfd6] bg-[rgba(214,207,224,0.88)] text-[#755fa0] hover:bg-[rgba(222,215,231,0.98)]'
      : 'border-[#b7c8d7] bg-[rgba(210,220,231,0.96)] text-[#607a96] hover:bg-[rgba(219,228,236,0.98)]'
  }`;

  if (as === 'a') {
    return (
      <a href={href} className={className} aria-label={label}>
        {icon}
      </a>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      {icon}
    </button>
  );
}

function DetailCard({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-[1.1rem] border border-[#b7c8d7] bg-[rgba(209,220,231,0.72)] px-4 py-4 ${
        fullWidth ? 'sm:col-span-2' : ''
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6f89a4]">
        {label}
      </p>
      <p className="mt-2 break-words text-[0.92rem] font-semibold text-[#173b70]">
        {value}
      </p>
    </div>
  );
}

export default FacultyStudentList;
