import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FiBookOpen,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiRefreshCcw,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import AdminLayout from '../../layout/admin/AdminLayout';
import {
  getFullName,
  type AdminFacultyUser,
  type AdminOverviewResponse,
  type AdminSection,
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

type FacultyLoad = {
  id: string;
  facultyId: string;
  facultyName: string;
  sectionId: string;
  sectionName: string;
  curriculumTitle: string;
  curriculumCode: string;
  studentCount: number;
  subjectId: string;
  subjectTitle: string;
  subjectCode: string;
  schedule: string;
};

type FacultyAccountFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username: string;
  contactNumber: string;
  birthdate: string;
  address: string;
  section: string;
  password: string;
};

type SaveFacultyPayload = FacultyAccountFormState & {
  facultyId: string | null;
};

type SaveAssignmentPayload = {
  section: AdminSection;
  subjectId: string;
  teacherId: string;
  schedule: string;
  successTitle: string;
};

function emptyFacultyAccountForm(): FacultyAccountFormState {
  return {
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    username: '',
    contactNumber: '',
    birthdate: '',
    address: '',
    section: '',
    password: '',
  };
}

function getSectionSubjectTeachers(
  section: AdminSection,
  subjectId: string,
  teacherId: string,
  schedule: string,
) {
  return section.subjectAssignments.map((assignment) => ({
    subjectId: assignment.subjectId,
    teacherId: assignment.subjectId === subjectId
      ? teacherId
      : assignment.teacherId ?? '',
    schedule: assignment.subjectId === subjectId
      ? schedule
      : assignment.schedule ?? '',
  }));
}

function buildFacultyLoads(
  sections: AdminSection[],
  facultyById: Map<string, AdminFacultyUser>,
) {
  return sections.flatMap((section) =>
    section.subjectAssignments.flatMap((assignment) => {
      if (!assignment.teacherId) {
        return [];
      }

      const faculty = facultyById.get(assignment.teacherId);

      return [{
        id: `${section.id}-${assignment.subjectId}`,
        facultyId: assignment.teacherId,
        facultyName: assignment.teacherName || faculty?.fullName || 'Faculty',
        sectionId: section.id,
        sectionName: section.name,
        curriculumTitle: section.curriculumTitle,
        curriculumCode: section.curriculumCode,
        studentCount: section.studentCount,
        subjectId: assignment.subjectId,
        subjectTitle: assignment.subjectTitle,
        subjectCode: assignment.subjectCode,
        schedule: assignment.schedule ?? '',
      }];
    }),
  );
}

function formatDate(value: string) {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function AdminFaculty() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, adminOverviewQuery } = useAdminOverview();
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [facultyForm, setFacultyForm] = useState<FacultyAccountFormState>(emptyFacultyAccountForm);
  const [facultyFieldErrors, setFacultyFieldErrors] = useState<Record<string, string>>({});
  const [searchValue, setSearchValue] = useState('');
  const [viewFacultyId, setViewFacultyId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loadSchedule, setLoadSchedule] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const fullName = getFullName(activeUser);
  const facultyUsers = adminOverviewQuery.data?.facultyUsers ?? [];
  const sections = adminOverviewQuery.data?.sections ?? [];
  const facultyById = useMemo(
    () => new Map(facultyUsers.map((facultyUser) => [facultyUser.id, facultyUser])),
    [facultyUsers],
  );
  const viewedFaculty = viewFacultyId ? facultyById.get(viewFacultyId) ?? null : null;
  const assignableSections = useMemo(
    () => sections.filter((section) => section.curriculumId && section.subjectAssignments.length > 0),
    [sections],
  );
  const selectedSection = useMemo(
    () => assignableSections.find((section) => section.id === selectedSectionId) ?? null,
    [assignableSections, selectedSectionId],
  );
  const facultyLoads = useMemo(
    () => buildFacultyLoads(sections, facultyById),
    [facultyById, sections],
  );
  const viewedFacultyLoads = useMemo(
    () => facultyLoads.filter((load) => load.facultyId === viewFacultyId),
    [facultyLoads, viewFacultyId],
  );
  const loadCountByFacultyId = useMemo(() => {
    const loadMap = new Map<string, number>();

    facultyLoads.forEach((load) => {
      loadMap.set(load.facultyId, (loadMap.get(load.facultyId) ?? 0) + 1);
    });

    return loadMap;
  }, [facultyLoads]);
  const filteredFacultyUsers = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return facultyUsers;
    }

    return facultyUsers.filter((facultyUser) =>
      [
        facultyUser.fullName,
        facultyUser.username,
        facultyUser.email,
        facultyUser.section,
        facultyUser.contactNumber,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch)),
    );
  }, [facultyUsers, searchValue]);
  const sectionOptions = useMemo(
    () => assignableSections.map((section) => ({
      value: section.id,
      label: `${section.name} | ${section.curriculumCode || section.curriculumTitle}`,
    })),
    [assignableSections],
  );
  const subjectOptions = useMemo(
    () => (selectedSection?.subjectAssignments ?? []).map((assignment) => ({
      value: assignment.subjectId,
      label: `${assignment.subjectTitle} | ${assignment.subjectCode}${
        assignment.teacherName ? ` | ${assignment.teacherName}` : ' | Unassigned'
      }`,
    })),
    [selectedSection],
  );

  useEffect(() => {
    if (viewFacultyId && !facultyUsers.some((facultyUser) => facultyUser.id === viewFacultyId)) {
      setViewFacultyId(null);
    }
  }, [facultyUsers, viewFacultyId]);

  useEffect(() => {
    if (selectedSectionId && !assignableSections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId('');
      setSelectedSubjectId('');
      setLoadSchedule('');
    }
  }, [assignableSections, selectedSectionId]);

  useEffect(() => {
    if (
      selectedSubjectId &&
      !selectedSection?.subjectAssignments.some((assignment) => assignment.subjectId === selectedSubjectId)
    ) {
      setSelectedSubjectId('');
      setLoadSchedule('');
    }
  }, [selectedSection, selectedSubjectId]);

  const saveFacultyMutation = useMutation({
    mutationFn: async (payload: SaveFacultyPayload) => {
      const endpoint = payload.facultyId
        ? `/api/admin/faculty/${payload.facultyId}`
        : '/api/admin/faculty';
      const response = await fetch(endpoint, {
        method: payload.facultyId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: payload.firstName,
          middleName: payload.middleName,
          lastName: payload.lastName,
          email: payload.email,
          username: payload.username,
          contactNumber: payload.contactNumber,
          birthdate: payload.birthdate,
          address: payload.address,
          section: payload.section,
          password: payload.password,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save faculty account') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        message: data.message ?? 'Faculty account saved',
        data: data.data,
        payload,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      const normalizedUsername = result.payload.username.trim().toLowerCase();
      const savedFaculty = result.data.facultyUsers.find((facultyUser) =>
        facultyUser.id === result.payload.facultyId || facultyUser.username === normalizedUsername,
      );

      if (savedFaculty) {
        setViewFacultyId(savedFaculty.id);
      }

      setNotification({
        open: true,
        title: result.payload.facultyId ? 'Faculty account updated' : 'Faculty account created',
        message: result.message,
        variant: 'success',
      });
      resetFacultyForm();
    },
    onError: (error: MutationError) => {
      setFacultyFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save faculty account',
        message: error.message || 'Please review the faculty account details and try again.',
        variant: 'error',
      });
    },
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async (payload: SaveAssignmentPayload) => {
      const response = await fetch(`/api/admin/sections/${payload.section.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: payload.section.name,
          course: payload.section.course,
          batchNumber: payload.section.batchNumber,
          sectionNumber: payload.section.sectionNumber,
          adviserId: payload.section.adviserId ?? '',
          curriculumId: payload.section.curriculumId ?? '',
          subjectTeachers: getSectionSubjectTeachers(
            payload.section,
            payload.subjectId,
            payload.teacherId,
            payload.schedule,
          ),
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save faculty assignment') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        message: data.message ?? 'Faculty assignment saved',
        data: data.data,
        successTitle: payload.successTitle,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      setNotification({
        open: true,
        title: result.successTitle,
        message: result.message,
        variant: 'success',
      });
      resetLoadForm();
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save assignment',
        message: error.message || 'Please review the faculty assignment and try again.',
        variant: 'error',
      });
    },
  });

  function resetFacultyForm() {
    setEditingFacultyId(null);
    setFacultyForm(emptyFacultyAccountForm());
    setFacultyFieldErrors({});
  }

  function resetLoadForm() {
    setSelectedSectionId('');
    setSelectedSubjectId('');
    setLoadSchedule('');
    setFieldErrors({});
  }

  function openLoadModal(facultyUser: AdminFacultyUser) {
    setViewFacultyId(facultyUser.id);
    resetLoadForm();
  }

  function closeLoadModal() {
    setViewFacultyId(null);
    resetLoadForm();
  }

  function startEditingFaculty(facultyUser: AdminFacultyUser) {
    setEditingFacultyId(facultyUser.id);
    setFacultyForm({
      firstName: facultyUser.firstName,
      middleName: facultyUser.middleName,
      lastName: facultyUser.lastName,
      email: facultyUser.email,
      username: facultyUser.username,
      contactNumber: facultyUser.contactNumber,
      birthdate: facultyUser.birthdate,
      address: facultyUser.address,
      section: facultyUser.section,
      password: '',
    });
    setFacultyFieldErrors({});
  }

  function handleFacultySubmit() {
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<keyof FacultyAccountFormState> = [
      'firstName',
      'middleName',
      'lastName',
      'email',
      'username',
      'contactNumber',
      'birthdate',
      'address',
      'section',
    ];

    requiredFields.forEach((field) => {
      if (!facultyForm[field].trim()) {
        nextErrors[field] = 'Required';
      }
    });

    if (!editingFacultyId && facultyForm.password.length < 8) {
      nextErrors.password = 'At least 8 characters';
    }

    if (editingFacultyId && facultyForm.password && facultyForm.password.length < 8) {
      nextErrors.password = 'At least 8 characters';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFacultyFieldErrors(nextErrors);
      return;
    }

    saveFacultyMutation.mutate({
      facultyId: editingFacultyId,
      firstName: facultyForm.firstName.trim(),
      middleName: facultyForm.middleName.trim(),
      lastName: facultyForm.lastName.trim(),
      email: facultyForm.email.trim(),
      username: facultyForm.username.trim(),
      contactNumber: facultyForm.contactNumber.trim(),
      birthdate: facultyForm.birthdate,
      address: facultyForm.address.trim(),
      section: facultyForm.section.trim(),
      password: facultyForm.password,
    });
  }

  function handleAssign() {
    const nextErrors: Record<string, string> = {};

    if (!viewFacultyId) {
      nextErrors.facultyId = 'Choose faculty';
    }

    if (!selectedSection) {
      nextErrors.sectionId = 'Choose section';
    }

    if (!selectedSubjectId) {
      nextErrors.subjectId = 'Choose subject';
    }

    if (!loadSchedule.trim()) {
      nextErrors.schedule = 'Add schedule';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    if (!selectedSection || !viewFacultyId) {
      return;
    }

    saveAssignmentMutation.mutate({
      section: selectedSection,
      subjectId: selectedSubjectId,
      teacherId: viewFacultyId,
      schedule: loadSchedule.trim(),
      successTitle: 'Teaching load assigned',
    });
  }

  function handleRemove(load: FacultyLoad) {
    const section = sections.find((sectionItem) => sectionItem.id === load.sectionId);

    if (!section) {
      return;
    }

    saveAssignmentMutation.mutate({
      section,
      subjectId: load.subjectId,
      teacherId: '',
      schedule: '',
      successTitle: 'Teaching load removed',
    });
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
      pageTitle="Faculty"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="mx-auto w-full max-w-[98rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.8rem] border border-[#c9d7db] bg-[linear-gradient(135deg,rgba(251,254,254,0.97)_0%,rgba(238,245,246,0.95)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(54,79,92,0.07)] sm:px-6 sm:py-5">
          <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f8d99]">
            Faculty management
          </p>
          <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.05em] text-[#173b47]">
            Create faculty accounts first, then manage teaching loads in a detail view.
          </h1>
          <p className="mt-2 max-w-3xl text-fluid-sm leading-6 text-[#607c88]">
            Faculty accounts control portal access. Teaching loads connect a teacher to a section,
            subject, and schedule so the correct students see the correct subject.
          </p>
        </section>

        <div className="mt-5 rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#173b47]">
                {editingFacultyId ? 'Edit faculty account' : 'Add faculty account'}
              </p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                {editingFacultyId
                  ? 'Update faculty details. Leave password blank to keep the current password.'
                  : 'Create the faculty login before assigning subjects or schedules.'}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
              <FiUsers className="h-4 w-4" />
              {facultyUsers.length} faculty
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <InputField label="First name" error={facultyFieldErrors.firstName}>
              <input
                type="text"
                value={facultyForm.firstName}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, firstName: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, firstName: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Middle name" error={facultyFieldErrors.middleName}>
              <input
                type="text"
                value={facultyForm.middleName}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, middleName: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, middleName: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Last name" error={facultyFieldErrors.lastName}>
              <input
                type="text"
                value={facultyForm.lastName}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, lastName: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, lastName: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Email" error={facultyFieldErrors.email}>
              <input
                type="email"
                value={facultyForm.email}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, email: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, email: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Username" error={facultyFieldErrors.username}>
              <input
                type="text"
                value={facultyForm.username}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, username: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, username: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label={editingFacultyId ? 'New password' : 'Password'} error={facultyFieldErrors.password}>
              <input
                type="password"
                value={facultyForm.password}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, password: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, password: '' }));
                }}
                placeholder={editingFacultyId ? 'Optional' : ''}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Contact" error={facultyFieldErrors.contactNumber}>
              <input
                type="text"
                value={facultyForm.contactNumber}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, contactNumber: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, contactNumber: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Birthdate" error={facultyFieldErrors.birthdate}>
              <input
                type="date"
                value={facultyForm.birthdate}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, birthdate: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, birthdate: '' }));
                }}
                className="admin-text-input"
              />
            </InputField>

            <InputField label="Department / section" error={facultyFieldErrors.section}>
              <input
                type="text"
                value={facultyForm.section}
                onChange={(event) => {
                  setFacultyForm((current) => ({ ...current, section: event.target.value }));
                  setFacultyFieldErrors((current) => ({ ...current, section: '' }));
                }}
                placeholder="Faculty"
                className="admin-text-input"
              />
            </InputField>

            <div className="lg:col-span-3">
              <InputField label="Address" error={facultyFieldErrors.address}>
                <textarea
                  rows={3}
                  value={facultyForm.address}
                  onChange={(event) => {
                    setFacultyForm((current) => ({ ...current, address: event.target.value }));
                    setFacultyFieldErrors((current) => ({ ...current, address: '' }));
                  }}
                  className="admin-text-input rounded-[1.2rem]"
                />
              </InputField>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleFacultySubmit}
              disabled={saveFacultyMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-3 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiUserCheck className="h-4 w-4" />
              {saveFacultyMutation.isPending
                ? 'Saving...'
                : editingFacultyId ? 'Update account' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={resetFacultyForm}
              className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-4 py-3 text-fluid-base font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
            >
              <FiRefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <section className="mt-5 rounded-[1.7rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#173b47]">Faculty list</p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                View a faculty member to add teaching loads, schedules, or remove assignments.
              </p>
            </div>
            <label className="flex min-w-0 items-center gap-3 rounded-[1.05rem] border border-[#c9d7db] bg-white px-4 py-2.5 text-[#6f8d99] lg:w-[25rem]">
              <FiSearch className="h-4 w-4 shrink-0" />
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search faculty"
                className="w-full bg-transparent text-fluid-base text-[#21485a] outline-none placeholder:text-[#8aa0a8]"
              />
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.45rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0">
                <thead>
                  <tr>
                    <TableHeadCell className="w-[25%] rounded-tl-[1.45rem]">Faculty</TableHeadCell>
                    <TableHeadCell className="w-[17%]">Department</TableHeadCell>
                    <TableHeadCell className="w-[20%]">Contact</TableHeadCell>
                    <TableHeadCell className="w-[14%]">Birthdate</TableHeadCell>
                    <TableHeadCell className="w-[12%]">Loads</TableHeadCell>
                    <TableHeadCell className="w-[12%] rounded-tr-[1.45rem] text-right">Actions</TableHeadCell>
                  </tr>
                </thead>
                <tbody>
                  {adminOverviewQuery.isLoading ? (
                    <TableMessageRow message="Loading faculty accounts..." />
                  ) : filteredFacultyUsers.length ? (
                    filteredFacultyUsers.map((facultyUser, index) => (
                      <tr
                        key={facultyUser.id}
                        className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                      >
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                            {facultyUser.fullName}
                          </p>
                          <p className="mt-1 truncate text-fluid-sm text-[#67828f]">
                            @{facultyUser.username}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm font-semibold text-[#4d6a77]">
                          {facultyUser.section || 'Faculty'}
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm font-semibold text-[#4d6a77]">
                            {facultyUser.email}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#7b95a1]">
                            {facultyUser.contactNumber || 'No contact'}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm text-[#5f7884]">
                          {formatDate(facultyUser.birthdate)}
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                            {loadCountByFacultyId.get(facultyUser.id) ?? 0}
                          </span>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openLoadModal(facultyUser)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                              aria-label={`View ${facultyUser.fullName}`}
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditingFaculty(facultyUser)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                              aria-label={`Edit ${facultyUser.fullName}`}
                            >
                              <FiEdit3 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <TableMessageRow message="No faculty accounts matched the current search." />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(viewedFaculty)}
        title={viewedFaculty?.fullName ?? 'Faculty details'}
        description={viewedFaculty ? `@${viewedFaculty.username} | ${viewedFaculty.email}` : ''}
        onClose={closeLoadModal}
        panelClassName="max-w-[72rem]"
        bodyClassName="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6"
        actions={(
          <button
            type="button"
            onClick={closeLoadModal}
            className="rounded-2xl border border-[#b7c7d6] bg-[rgba(255,255,255,0.88)] px-4 py-2.5 text-fluid-base font-semibold text-[#48617d] transition hover:bg-white"
          >
            Close
          </button>
        )}
      >
        {viewedFaculty ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <DetailCard label="Department" value={viewedFaculty.section || 'Faculty'} />
              <DetailCard label="Contact" value={viewedFaculty.contactNumber || 'Not set'} />
              <DetailCard label="Birthdate" value={formatDate(viewedFaculty.birthdate)} />
            </div>

            <section className="rounded-[1.35rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-fluid-lg font-semibold text-[#173b47]">Add teaching load</p>
                  <p className="mt-1 text-fluid-sm leading-6 text-[#607c88]">
                    Choose the section, subject, and schedule for this faculty member.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d1dde1] bg-white px-3 py-2 text-fluid-sm font-semibold text-[#52707d]">
                  <FiBookOpen className="h-4 w-4" />
                  {viewedFacultyLoads.length} loads
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                <InputField label="Section" error={fieldErrors.sectionId}>
                  <CustomSelect
                    id="faculty-load-section"
                    value={selectedSectionId}
                    onChange={(value) => {
                      setSelectedSectionId(value);
                      setSelectedSubjectId('');
                      setLoadSchedule('');
                      setFieldErrors((current) => ({ ...current, sectionId: '', subjectId: '' }));
                    }}
                    options={sectionOptions}
                    placeholder={sectionOptions.length ? 'Choose section' : 'No sections ready'}
                    tone="muted"
                  />
                </InputField>

                <InputField label="Subject" error={fieldErrors.subjectId}>
                  <CustomSelect
                    id="faculty-load-subject"
                    value={selectedSubjectId}
                    onChange={(value) => {
                      const assignment = selectedSection?.subjectAssignments.find((item) => item.subjectId === value);

                      setSelectedSubjectId(value);
                      setLoadSchedule(assignment?.schedule ?? '');
                      setFieldErrors((current) => ({ ...current, subjectId: '' }));
                    }}
                    options={subjectOptions}
                    placeholder={selectedSection ? 'Choose subject' : 'Choose section first'}
                    tone="muted"
                  />
                </InputField>

                <InputField label="Schedule" error={fieldErrors.schedule}>
                  <input
                    type="text"
                    value={loadSchedule}
                    onChange={(event) => {
                      setLoadSchedule(event.target.value);
                      setFieldErrors((current) => ({ ...current, schedule: '' }));
                    }}
                    placeholder="MWF 9:00 AM - 10:30 AM"
                    className="admin-text-input"
                  />
                </InputField>

                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={saveAssignmentMutation.isPending}
                  className="inline-flex h-[3.2rem] items-center justify-center gap-2 rounded-[1rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-5 text-fluid-base font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiCheckCircle className="h-4 w-4" />
                  {saveAssignmentMutation.isPending ? 'Saving...' : 'Add load'}
                </button>
              </div>
            </section>

            <section className="rounded-[1.35rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-fluid-lg font-semibold text-[#173b47]">Current teaching load</p>
                  <p className="mt-1 text-fluid-sm leading-6 text-[#607c88]">
                    These rows decide which students can see this subject for their section.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetLoadForm}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-[#d1dde1] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#52707d] transition hover:bg-[#f8fbfb]"
                >
                  <FiRefreshCcw className="h-4 w-4" />
                  Clear form
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[#d7e2e6] bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <TableHeadCell className="w-[24%] rounded-tl-[1.25rem]">Subject</TableHeadCell>
                        <TableHeadCell className="w-[18%]">Section</TableHeadCell>
                        <TableHeadCell className="w-[22%]">Schedule</TableHeadCell>
                        <TableHeadCell className="w-[20%]">Curriculum</TableHeadCell>
                        <TableHeadCell className="w-[8%]">Students</TableHeadCell>
                        <TableHeadCell className="w-[8%] rounded-tr-[1.25rem] text-right">Remove</TableHeadCell>
                      </tr>
                    </thead>
                    <tbody>
                      {viewedFacultyLoads.length ? (
                        viewedFacultyLoads.map((load, index) => (
                          <tr
                            key={load.id}
                            className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                          >
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <p className="truncate text-fluid-sm font-semibold text-[#173b47]">
                                {load.subjectTitle}
                              </p>
                              <p className="mt-1 text-fluid-xs uppercase tracking-[0.18em] text-[#7b95a1]">
                                {load.subjectCode}
                              </p>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm font-semibold text-[#4d6a77]">
                              {load.sectionName}
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm text-[#5f7884]">
                              {load.schedule || 'No schedule'}
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <p className="truncate text-fluid-sm font-semibold text-[#4d6a77]">
                                {load.curriculumTitle || 'No curriculum'}
                              </p>
                              <p className="mt-1 text-fluid-xs uppercase tracking-[0.18em] text-[#7b95a1]">
                                {load.curriculumCode || 'Not linked yet'}
                              </p>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                              <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold text-[#5a7885]">
                                {load.studentCount}
                              </span>
                            </td>
                            <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-right">
                              <button
                                type="button"
                                onClick={() => handleRemove(load)}
                                disabled={saveAssignmentMutation.isPending}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-[0.95rem] border border-[#ecd6d6] bg-[#fff7f7] text-[#a95f5f] transition hover:bg-[#fff1f1] disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={`Remove ${load.subjectTitle} from ${load.facultyName}`}
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <TableMessageRow message="No teaching load yet." colSpan={6} />
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        ) : null}
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

function TableMessageRow({
  message,
  colSpan = 6,
}: {
  message: string;
  colSpan?: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center text-fluid-base text-[#607c88]">
        {message}
      </td>
    </tr>
  );
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] px-4 py-4">
      <p className="text-fluid-3xs font-semibold uppercase tracking-[0.18em] text-[#6e8894]">
        {label}
      </p>
      <p className="mt-2 break-words text-fluid-md font-semibold text-[#173b47]">
        {value}
      </p>
    </div>
  );
}

export default AdminFaculty;
