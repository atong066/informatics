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
import FacultyLayout from '../../layout/faculty/FacultyLayout';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import { getStoredToken } from '../../lib/auth';

type StudentListItem = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
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
    () => [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName]
      .filter(Boolean)
      .join(' '),
    [activeUser?.firstName, activeUser?.middleName, activeUser?.lastName],
  );

  const sectionOptions = useMemo(() => {
    const sections = new Set(
      (studentsQuery.data ?? [])
        .map((student) => student.section)
        .filter(Boolean),
    );

    return ['All sections', ...Array.from(sections).sort((a, b) => a.localeCompare(b))];
  }, [studentsQuery.data]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return (studentsQuery.data ?? []).filter((student) => {
      const matchesSearch = normalizedSearch.length === 0
        || [
          student.fullName,
          student.email,
          student.username,
          student.section,
          student.contactNumber,
        ].some((value) => value?.toLowerCase().includes(normalizedSearch));

      const matchesSection = selectedSection === 'All sections'
        || student.section === selectedSection;

      const matchesStatus = selectedStatus === 'All status'
        || student.status === selectedStatus;

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [searchValue, selectedSection, selectedStatus, studentsQuery.data]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, pageCount);
  const paginatedStudents = filteredStudents.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE,
  );
  const startEntry = filteredStudents.length === 0 ? 0 : (currentPageSafe - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(currentPageSafe * PAGE_SIZE, filteredStudents.length);

  const totalStudents = studentsQuery.data?.length ?? 0;

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
      <div className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[#c9d5e0] bg-[linear-gradient(180deg,rgba(252,253,255,0.96)_0%,rgba(244,248,252,0.96)_100%)] shadow-[0_20px_38px_rgba(49,70,98,0.08)]">
          <div className="border-b border-[#dae4ec] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 md:grid-cols-3 xl:flex xl:items-center">
                <div className="min-w-[220px] rounded-[1rem] border border-[#d3ddec] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(62,91,126,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a3bb]">
                    Filter
                  </p>
                  <div className="mt-1">
                    <CustomSelect
                      id="faculty-student-section-filter"
                      options={sectionOptions}
                      placeholder="All sections"
                      value={selectedSection}
                      onChange={(value) => {
                        setSelectedSection(value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="min-w-[220px] rounded-[1rem] border border-[#d3ddec] bg-white px-4 py-3 shadow-[0_6px_16px_rgba(62,91,126,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a3bb]">
                    Filter
                  </p>
                  <div className="mt-1">
                    <CustomSelect
                      id="faculty-student-status-filter"
                      options={['All status', 'Active', 'Incomplete docs']}
                      placeholder="All status"
                      value={selectedStatus}
                      onChange={(value) => {
                        setSelectedStatus(value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="flex min-w-[180px] items-center gap-3 rounded-[1rem] border border-[#d3ddec] bg-white px-4 py-3 text-[#8aa0b7] shadow-[0_6px_16px_rgba(62,91,126,0.05)]">
                  <FiUsers className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#91a3bb]">
                      Summary
                    </p>
                    <p className="mt-1 text-[15px] font-medium text-[#25456d]">
                      {totalStudents} students
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] border border-[#d3ddec] bg-white px-4 py-3 text-[#8aa0b7] shadow-[0_6px_16px_rgba(62,91,126,0.05)] sm:min-w-[320px]">
                  <FiSearch className="h-4 w-4 shrink-0" />
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(event) => {
                      setSearchValue(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search student, email, username, section"
                    className="w-full bg-transparent text-[14px] text-[#25456d] outline-none placeholder:text-[#92a4b8]"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => exportStudentsToCsv(filteredStudents)}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#d3ddec] bg-white px-4 py-3 text-[14px] font-medium text-[#34547c] shadow-[0_6px_16px_rgba(62,91,126,0.05)] transition hover:bg-[#f7faff]"
                >
                  <FiDownload className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse">
              <thead className="bg-[linear-gradient(180deg,#f4f7fb_0%,#edf2f7_100%)]">
                <tr className="text-left">
                  <th className="w-14 px-4 py-4">
                    <input
                      type="checkbox"
                      aria-label="Select all students"
                      className="h-4 w-4 rounded border border-[#bccbda] accent-[#5f6cf7]"
                    />
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Student
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Section
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Username
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Status
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Birthdate
                  </th>
                  <th className="px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Contact
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8fb0]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e2e9f0] bg-white/90">
                {studentsQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14">
                      <div className="flex items-center gap-3 text-[14px] text-[#6d86a0]">
                        <FiUsers className="h-4 w-4" />
                        Loading student records...
                      </div>
                    </td>
                  </tr>
                ) : studentsQuery.isError ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14">
                      <div className="flex items-center gap-3 text-[14px] text-rose-600">
                        <FiAlertCircle className="h-4 w-4" />
                        Failed to load the student list.
                      </div>
                    </td>
                  </tr>
                ) : paginatedStudents.length > 0 ? (
                  paginatedStudents.map((student) => (
                    <tr key={student.id} className="transition hover:bg-[#f8fbff]">
                      <td className="px-4 py-4 align-middle">
                        <input
                          type="checkbox"
                          aria-label={`Select ${student.fullName}`}
                          className="h-4 w-4 rounded border border-[#bccbda] accent-[#5f6cf7]"
                        />
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          {student.profileImage ? (
                            <img
                              src={student.profileImage}
                              alt={`${student.fullName} profile`}
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#dbe8f7_0%,#c8d9ec_100%)] text-[13px] font-semibold text-[#315c90]">
                              {getInitials(student)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-semibold text-[#163d73]">
                              {student.fullName}
                            </p>
                            <p className="truncate text-[13px] text-[#758ca5]">{student.email}</p>
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
                              ? 'border-[#bce8cf] bg-[#effbf4] text-[#12815a]'
                              : 'border-[#f2d9bc] bg-[#fff5e8] text-[#b06b15]'
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
                          <button
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8e2ec] bg-[#f6f9fc] text-[#7085a0] transition hover:bg-white"
                            aria-label={`Preview ${student.fullName}`}
                          >
                            <FiEye className="h-4 w-4" />
                          </button>
                          <a
                            href={`mailto:${student.email}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8e2ec] bg-[#f6f9fc] text-[#7085a0] transition hover:bg-white"
                            aria-label={`Email ${student.fullName}`}
                          >
                            <FiMail className="h-4 w-4" />
                          </a>
                          <a
                            href={student.contactNumber ? `tel:${student.contactNumber}` : undefined}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f1d6d6] bg-[#fff4f4] text-[#d26a6a] transition hover:bg-white"
                            aria-label={`Call ${student.fullName}`}
                          >
                            <FiPhone className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-14">
                      <div className="flex items-center gap-3 text-[14px] text-[#6d86a0]">
                        <FiUsers className="h-4 w-4" />
                        No students matched the current filters.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#dae4ec] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[#7b8fa8]">
              {startEntry}-{endEntry} of {filteredStudents.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPageSafe === 1}
                className="inline-flex h-10 items-center gap-2 rounded-[0.9rem] border border-[#d4deea] bg-white px-3 text-[14px] text-[#758ba4] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" />
                Prev
              </button>

              {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 5).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-10 min-w-10 rounded-[0.9rem] border px-3 text-[14px] font-medium transition ${
                    page === currentPageSafe
                      ? 'border-[#6975f6] bg-[#6975f6] text-white shadow-[0_10px_20px_rgba(93,106,242,0.22)]'
                      : 'border-[#d4deea] bg-white text-[#4e6883]'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
                disabled={currentPageSafe === pageCount}
                className="inline-flex h-10 items-center gap-2 rounded-[0.9rem] border border-[#d4deea] bg-white px-3 text-[14px] text-[#758ba4] transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </FacultyLayout>
  );
}

export default FacultyStudentList;
