import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEdit3,
  FiPlus,
  FiSearch,
  FiUsers,
} from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import AdminLayout from '../../layout/admin/AdminLayout';
import {
  getFullName,
  type AdminOverviewResponse,
  type AdminStudentUser,
  useAdminOverview,
} from './adminData';

type NotificationState = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
};

type MutationError = Error & {
  fieldErrors?: Record<string, string>;
};

type StudentFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  contactNumber: string;
  birthdate: string;
  address: string;
  course: string;
  batchNumber: string;
  sectionNumber: string;
};

type SaveStudentPayload = {
  mode: 'create' | 'edit';
  studentId: string | null;
  form: StudentFormState;
};

const courseOptions = [
  { value: 'DCS', label: 'DCS | Diploma in Computer Studies' },
  { value: 'DIT', label: 'DIT | Diploma in Information Technology' },
];
const PAGE_SIZE = 10;

function normalizeSectionKey(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-+/g, '-');
}

function emptyStudentForm(): StudentFormState {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    contactNumber: '',
    birthdate: '',
    address: '',
    course: '',
    batchNumber: '',
    sectionNumber: '',
  };
}

function buildSectionLabel(course: string, batchNumber: string, sectionNumber: string) {
  const normalizedCourse = course.trim().toUpperCase();
  const normalizedBatch = batchNumber.trim().replace(/^B/i, '');
  const normalizedSection = sectionNumber.trim();

  if (!normalizedCourse || !normalizedBatch || !normalizedSection) {
    return '';
  }

  return [normalizedCourse, `B${normalizedBatch}`, normalizedSection]
    .filter(Boolean)
    .join(' - ');
}

function parseSectionLabel(sectionName: string) {
  const match = sectionName
    .trim()
    .match(/^([A-Za-z0-9]+)\s*-\s*B?(\d+)(?:\s*-\s*([A-Za-z0-9]+))?$/i);

  if (!match) {
    return {
      course: '',
      batchNumber: '',
      sectionNumber: '',
    };
  }

  return {
    course: match[1]?.toUpperCase() ?? '',
    batchNumber: match[2] ?? '',
    sectionNumber: match[3] ?? '',
  };
}

function buildStudentForm(student: AdminStudentUser): StudentFormState {
  const parsedSection = student.course && student.batchNumber
    ? {
      course: student.course,
      batchNumber: student.batchNumber,
      sectionNumber: student.sectionNumber,
    }
    : parseSectionLabel(student.section);

  return {
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    email: student.email,
    username: student.username,
    password: '',
    contactNumber: student.contactNumber,
    birthdate: student.birthdate,
    address: student.address,
    course: parsedSection.course,
    batchNumber: parsedSection.batchNumber,
    sectionNumber: parsedSection.sectionNumber,
  };
}

function AdminStudents() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, adminOverviewQuery } = useAdminOverview();
  const [searchValue, setSearchValue] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentUser | null>(null);
  const [studentForm, setStudentForm] = useState<StudentFormState>(emptyStudentForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const fullName = getFullName(activeUser);
  const students = adminOverviewQuery.data?.studentUsers ?? [];
  const availableSections = adminOverviewQuery.data?.availableSections ?? [];
  const sectionOptions = useMemo(
    () => [
      { value: '', label: 'All sections' },
      ...availableSections
        .filter((section) => parseSectionLabel(section).sectionNumber)
        .map((section) => ({
          value: section,
          label: section,
        })),
    ],
    [availableSections],
  );
  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const selectedSectionKey = normalizeSectionKey(sectionFilter);

    return students.filter((student) => {
      const matchesSearch = !normalizedSearch || [
        student.fullName,
        student.username,
        student.email,
        student.contactNumber,
        student.section,
        student.course,
        student.batchNumber,
        student.sectionNumber,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
      const matchesSection =
        !selectedSectionKey ||
        normalizeSectionKey(student.section) === selectedSectionKey;

      return matchesSearch && matchesSection;
    });
  }, [searchValue, sectionFilter, students]);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleStudents = filteredStudents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const isCreateMode = formMode === 'create';

  const saveStudentMutation = useMutation({
    mutationFn: async (payload: SaveStudentPayload) => {
      const endpoint = payload.mode === 'create'
        ? '/api/admin/students'
        : `/api/admin/students/${payload.studentId}`;
      const response = await fetch(endpoint, {
        method: payload.mode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload.form,
          course: payload.form.course.trim().toUpperCase(),
          batchNumber: payload.form.batchNumber.trim().replace(/^B/i, ''),
          sectionNumber: payload.form.sectionNumber.trim(),
          section: buildSectionLabel(
            payload.form.course,
            payload.form.batchNumber,
            payload.form.sectionNumber,
          ),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save student') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        mode: payload.mode,
        message: data.message ?? 'Student saved successfully',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      resetModal();
      setNotification({
        open: true,
        title: result.mode === 'create' ? 'Student enrolled' : 'Student updated',
        message: result.message,
        variant: 'success',
      });
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save student',
        message: error.message || 'Please review the student details and try again.',
        variant: 'error',
      });
    },
  });

  function updateFormField(field: keyof StudentFormState, value: string) {
    setStudentForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '', section: '' }));
  }

  function startEnrolling() {
    setFormMode('create');
    setSelectedStudent(null);
    setStudentForm(emptyStudentForm());
    setFieldErrors({});
  }

  function startEditing(student: AdminStudentUser) {
    setFormMode('edit');
    setSelectedStudent(student);
    setStudentForm(buildStudentForm(student));
    setFieldErrors({});
  }

  function resetModal() {
    setFormMode(null);
    setSelectedStudent(null);
    setStudentForm(emptyStudentForm());
    setFieldErrors({});
  }

  function saveStudent() {
    const requiredFields: Array<keyof StudentFormState> = [
      'firstName',
      'middleName',
      'lastName',
      'email',
      'username',
      'contactNumber',
      'birthdate',
      'address',
      'course',
      'batchNumber',
      'sectionNumber',
    ];
    const nextErrors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      if (!studentForm[field].trim()) {
        nextErrors[field] = 'Required';
      }
    });

    if (isCreateMode && !studentForm.password.trim()) {
      nextErrors.password = 'Required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    saveStudentMutation.mutate({
      mode: isCreateMode ? 'create' : 'edit',
      studentId: selectedStudent?.id ?? null,
      form: {
        ...studentForm,
        course: studentForm.course.trim().toUpperCase(),
        batchNumber: studentForm.batchNumber.trim().replace(/^B/i, ''),
        sectionNumber: studentForm.sectionNumber.trim(),
      },
    });
  }

  async function exportStudentsPdf() {
    if (!filteredStudents.length) {
      setNotification({
        open: true,
        title: 'No students to export',
        message: 'Adjust the filters before exporting a PDF.',
        variant: 'error',
      });
      return;
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const generatedAt = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date());
    const columns = [
      { label: '#', x: margin, width: 28 },
      { label: 'Student', x: margin + 32, width: 150 },
      { label: 'Username', x: margin + 188, width: 92 },
      { label: 'Section', x: margin + 286, width: 100 },
      { label: 'Contact', x: margin + 392, width: 96 },
      { label: 'Email', x: margin + 494, width: pageWidth - margin - (margin + 494) },
    ];
    let y = 112;

    const drawHeader = () => {
      doc.setTextColor('#173b47');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Student List', margin, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#607c88');
      doc.text(`Generated: ${generatedAt}`, margin, 60);
      doc.text(`Section: ${sectionFilter || 'All sections'}`, margin, 76);
      doc.text(`Search: ${searchValue.trim() || 'None'}`, margin + 180, 76);
      doc.text(`Students: ${filteredStudents.length}`, margin + 360, 76);
      doc.setDrawColor('#c9d7db');
      doc.line(margin, 92, pageWidth - margin, 92);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor('#45616f');
      columns.forEach((column) => {
        doc.text(column.label, column.x, 104);
      });
      doc.line(margin, 110, pageWidth - margin, 110);
      y = 126;
    };

    drawHeader();

    filteredStudents.forEach((student, index) => {
      if (y > pageHeight - 44) {
        doc.addPage();
        drawHeader();
      }

      const rowValues = [
        String(index + 1),
        student.fullName,
        student.username,
        student.section || 'Not assigned',
        student.contactNumber,
        student.email,
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#21485a');
      rowValues.forEach((value, columnIndex) => {
        const column = columns[columnIndex];
        doc.text(
          doc.splitTextToSize(value || ' ', column.width),
          column.x,
          y,
          { maxWidth: column.width },
        );
      });
      doc.setDrawColor('#e2eaed');
      doc.line(margin, y + 10, pageWidth - margin, y + 10);
      y += 22;
    });

    const sectionSuffix = sectionFilter
      ? normalizeSectionKey(sectionFilter).toLowerCase()
      : 'all-sections';
    doc.save(`students-${sectionSuffix}.pdf`);
  }

  if (!activeUser || isError) {
    return null;
  }

  return (
    <AdminLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section || 'Administration'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Admin workspace"
      pageTitle="Students"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative z-30 rounded-[1.8rem] border border-[#c9d7db] bg-[linear-gradient(135deg,rgba(251,254,254,0.97)_0%,rgba(238,245,246,0.95)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(54,79,92,0.07)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f8d99]">
                Student management
              </p>
              <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.05em] text-[#173b47]">
                Enroll students and keep their account details current.
              </h1>
            </div>

            <div className="relative z-40 flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-wrap lg:justify-end">
              <div className="relative z-50 w-full sm:w-[15rem]">
                <CustomSelect
                  id="student-section-filter"
                  value={sectionFilter}
                  onChange={(value) => {
                    setSectionFilter(value);
                    setCurrentPage(1);
                  }}
                  options={sectionOptions}
                  placeholder="All sections"
                  tone="muted"
                />
              </div>
              <div className="inline-flex w-full items-center gap-2 rounded-[1rem] border border-[#c9d7db] bg-white px-3 py-2 text-[#52707d] sm:w-[22rem]">
                <FiSearch className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => {
                    setSearchValue(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search students"
                  className="min-w-0 flex-1 bg-transparent text-fluid-sm text-[#21485a] outline-none placeholder:text-[#7d96a2]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  void exportStudentsPdf();
                }}
                disabled={adminOverviewQuery.isLoading || !filteredStudents.length}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#c9d7db] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiDownload className="h-4 w-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={startEnrolling}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105"
              >
                <FiPlus className="h-4 w-4" />
                Enroll student
              </button>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#173b47]">Student list</p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                Showing up to {PAGE_SIZE} students per page.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
              <FiUsers className="h-4 w-4" />
              {filteredStudents.length} students
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.45rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)]">
            {adminOverviewQuery.isLoading ? (
              <EmptyState title="Loading students..." description="Student accounts are being prepared." />
            ) : adminOverviewQuery.isError ? (
              <EmptyState title="Unable to load students" description="Refresh the page or try again in a moment." />
            ) : visibleStudents.length ? (
              <div className="scrollbar-super-thin overflow-auto">
                <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <TableHeadCell className="w-[22%] rounded-tl-[1.45rem]">Student</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Course</TableHeadCell>
                      <TableHeadCell className="w-[10%]">Batch</TableHeadCell>
                      <TableHeadCell className="w-[15%]">Section</TableHeadCell>
                      <TableHeadCell className="w-[16%]">Contact</TableHeadCell>
                      <TableHeadCell className="w-[17%]">Email</TableHeadCell>
                      <TableHeadCell className="w-[8%] rounded-tr-[1.45rem] text-right">Edit</TableHeadCell>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                      >
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                            {student.fullName}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#7b95a1]">
                            @{student.username}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                            {student.course || 'Not set'}
                          </span>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="text-fluid-sm font-semibold text-[#4d6a77]">
                            {student.batchNumber ? `B${student.batchNumber}` : 'Not set'}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm font-semibold text-[#4d6a77]">
                            {student.section || 'Not assigned'}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm text-[#4d6a77]">{student.contactNumber}</p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm text-[#4d6a77]">{student.email}</p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => startEditing(student)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                            aria-label={`Edit ${student.fullName}`}
                          >
                            <FiEdit3 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No students found" description="Adjust the search or enroll a student account." />
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-fluid-sm text-[#6f8d99]">
              Page {safePage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(formMode)}
        title={isCreateMode ? 'Enroll student' : selectedStudent ? `Edit ${selectedStudent.fullName}` : 'Edit student'}
        description={isCreateMode ? 'Create a student account and assign their academic placement.' : 'Update account details, section, or reset the password.'}
        onClose={resetModal}
        panelClassName="max-w-4xl"
        bodyClassName="max-h-[70vh] overflow-auto px-5 py-5 sm:px-6"
        actions={(
          <>
            <button
              type="button"
              onClick={resetModal}
              className="inline-flex items-center justify-center rounded-[1rem] border border-[#b7c7d6] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#48617d] transition hover:bg-[#f8fbfb]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveStudent}
              disabled={saveStudentMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiUsers className="h-4 w-4" />
              {saveStudentMutation.isPending ? 'Saving...' : isCreateMode ? 'Enroll student' : 'Save changes'}
            </button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <InputField label="Last name" error={fieldErrors.lastName}>
            <input
              type="text"
              value={studentForm.lastName}
              onChange={(event) => updateFormField('lastName', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="First name" error={fieldErrors.firstName}>
            <input
              type="text"
              value={studentForm.firstName}
              onChange={(event) => updateFormField('firstName', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Middle name" error={fieldErrors.middleName}>
            <input
              type="text"
              value={studentForm.middleName}
              onChange={(event) => updateFormField('middleName', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Email" error={fieldErrors.email}>
            <input
              type="email"
              value={studentForm.email}
              onChange={(event) => updateFormField('email', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Username" error={fieldErrors.username}>
            <input
              type="text"
              value={studentForm.username}
              onChange={(event) => updateFormField('username', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label={isCreateMode ? 'Password' : 'New password'} error={fieldErrors.password}>
            <input
              type="password"
              value={studentForm.password}
              onChange={(event) => updateFormField('password', event.target.value)}
              placeholder={isCreateMode ? '' : 'Optional'}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Contact" error={fieldErrors.contactNumber}>
            <input
              type="text"
              value={studentForm.contactNumber}
              onChange={(event) => updateFormField('contactNumber', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Birthdate" error={fieldErrors.birthdate}>
            <input
              type="date"
              value={studentForm.birthdate}
              onChange={(event) => updateFormField('birthdate', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Address" error={fieldErrors.address}>
            <input
              type="text"
              value={studentForm.address}
              onChange={(event) => updateFormField('address', event.target.value)}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Course" error={fieldErrors.course}>
            <CustomSelect
              id="student-course"
              value={studentForm.course}
              onChange={(value) => updateFormField('course', value)}
              options={courseOptions}
              placeholder="Choose course"
              tone="muted"
            />
          </InputField>

          <InputField label="Batch number" error={fieldErrors.batchNumber}>
            <input
              type="text"
              inputMode="numeric"
              value={studentForm.batchNumber}
              onChange={(event) => updateFormField('batchNumber', event.target.value.replace(/^B/i, ''))}
              placeholder="7"
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Section" error={fieldErrors.sectionNumber || fieldErrors.section}>
            <input
              type="text"
              value={studentForm.sectionNumber}
              onChange={(event) => updateFormField('sectionNumber', event.target.value)}
              placeholder="2"
              className="admin-text-input"
            />
          </InputField>
        </div>

        <div className="mt-4 rounded-[1.1rem] border border-[#c5d4df] bg-white px-4 py-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#7b95a1]">
            Section label
          </p>
          <p className="mt-1 text-fluid-base font-semibold text-[#173b47]">
            {buildSectionLabel(studentForm.course, studentForm.batchNumber, studentForm.sectionNumber)
              || 'Choose course, batch, and section'}
          </p>
        </div>
      </Modal>
    </AdminLayout>
  );
}

function InputField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-fluid-sm font-semibold text-[#173b47]">{label}</label>
        {error ? <span className="text-fluid-xs font-medium text-rose-500">{error}</span> : null}
      </div>
      {children}
    </div>
  );
}

function TableHeadCell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-[#d7e2e6] bg-[linear-gradient(180deg,#eef5f7_0%,#e6eef1_100%)] px-4 py-3 text-left text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#6e8894] ${className}`}
    >
      {children}
    </th>
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
    <div className="px-6 py-10 text-center">
      <p className="text-fluid-md font-semibold text-[#173b47]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">{description}</p>
    </div>
  );
}

export default AdminStudents;
