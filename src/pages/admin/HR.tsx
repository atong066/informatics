import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiEdit3, FiPlus, FiSearch, FiUserCheck } from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import AdminLayout from '../../layout/admin/AdminLayout';
import {
  getFullName,
  type AdminHrUser,
  type AdminOverviewResponse,
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

type HrAccountFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  contactNumber: string;
  birthdate: string;
  address: string;
  section: string;
  employeeNumber: string;
  position: string;
  employmentStatus: 'onboarding' | 'active' | 'on-leave' | 'inactive';
  hireDate: string;
  salaryRate: string;
  paySchedule: 'monthly' | 'semi-monthly' | 'hourly';
  emergencyContactName: string;
  emergencyContactNumber: string;
};

type SaveHrPayload = {
  mode: 'create' | 'edit';
  hrId: string | null;
  form: HrAccountFormState;
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'on-leave', label: 'On leave' },
  { value: 'inactive', label: 'Inactive' },
];
const payScheduleOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semi-monthly', label: 'Semi-monthly' },
  { value: 'hourly', label: 'Hourly' },
];

function emptyHrForm(): HrAccountFormState {
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
    section: 'Human Resources',
    employeeNumber: '',
    position: 'HR Officer',
    employmentStatus: 'active',
    hireDate: '',
    salaryRate: '0',
    paySchedule: 'monthly',
    emergencyContactName: '',
    emergencyContactNumber: '',
  };
}

function buildHrForm(hrUser: AdminHrUser): HrAccountFormState {
  return {
    firstName: hrUser.firstName,
    middleName: hrUser.middleName,
    lastName: hrUser.lastName,
    email: hrUser.email,
    username: hrUser.username,
    password: '',
    contactNumber: hrUser.contactNumber,
    birthdate: hrUser.birthdate,
    address: hrUser.address,
    section: hrUser.department || hrUser.section,
    employeeNumber: hrUser.employeeNumber,
    position: hrUser.position,
    employmentStatus: hrUser.employmentStatus,
    hireDate: hrUser.hireDate,
    salaryRate: String(hrUser.salaryRate ?? 0),
    paySchedule: hrUser.paySchedule,
    emergencyContactName: hrUser.emergencyContactName,
    emergencyContactNumber: hrUser.emergencyContactNumber,
  };
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

function AdminHR() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, adminOverviewQuery } = useAdminOverview();
  const [searchValue, setSearchValue] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selectedHrUser, setSelectedHrUser] = useState<AdminHrUser | null>(null);
  const [hrForm, setHrForm] = useState<HrAccountFormState>(emptyHrForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const hrUsers = adminOverviewQuery.data?.hrUsers;
  const filteredHrUsers = useMemo(() => {
    const availableHrUsers = hrUsers ?? [];
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return availableHrUsers;
    }

    return availableHrUsers.filter((hrUser) =>
      [
        hrUser.fullName,
        hrUser.username,
        hrUser.email,
        hrUser.employeeNumber,
        hrUser.department,
        hrUser.position,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [hrUsers, searchValue]);

  const saveHrMutation = useMutation({
    mutationFn: async (payload: SaveHrPayload) => {
      const endpoint = payload.mode === 'create'
        ? '/api/admin/hr'
        : `/api/admin/hr/${payload.hrId}`;
      const response = await fetch(endpoint, {
        method: payload.mode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payload.form,
          salaryRate: Number(payload.form.salaryRate || 0),
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: AdminOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save HR account') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        mode: payload.mode,
        message: data.message ?? 'HR account saved',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['admin-overview'], result.data);
      resetModal();
      setNotification({
        open: true,
        title: result.mode === 'create' ? 'HR account created' : 'HR account updated',
        message: result.message,
        variant: 'success',
      });
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save HR account',
        message: error.message || 'Review the HR account details and try again.',
        variant: 'error',
      });
    },
  });

  function updateFormField(field: keyof HrAccountFormState, value: string) {
    setHrForm((current) => ({ ...current, [field]: value } as HrAccountFormState));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  }

  function startCreating() {
    setFormMode('create');
    setSelectedHrUser(null);
    setHrForm(emptyHrForm());
    setFieldErrors({});
  }

  function startEditing(hrUser: AdminHrUser) {
    setFormMode('edit');
    setSelectedHrUser(hrUser);
    setHrForm(buildHrForm(hrUser));
    setFieldErrors({});
  }

  function resetModal() {
    setFormMode(null);
    setSelectedHrUser(null);
    setHrForm(emptyHrForm());
    setFieldErrors({});
  }

  function saveHrAccount() {
    const requiredFields: Array<keyof HrAccountFormState> = [
      'firstName',
      'middleName',
      'lastName',
      'email',
      'username',
      'contactNumber',
      'birthdate',
      'address',
      'section',
      'position',
      'hireDate',
    ];
    const nextErrors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      if (!hrForm[field].trim()) {
        nextErrors[field] = 'Required';
      }
    });

    if (formMode === 'create' && hrForm.password.length < 8) {
      nextErrors.password = 'At least 8 characters';
    }

    if (formMode === 'edit' && hrForm.password && hrForm.password.length < 8) {
      nextErrors.password = 'At least 8 characters';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    saveHrMutation.mutate({
      mode: formMode === 'edit' ? 'edit' : 'create',
      hrId: selectedHrUser?.id ?? null,
      form: {
        ...hrForm,
        email: hrForm.email.trim(),
        username: hrForm.username.trim(),
        section: hrForm.section.trim(),
        position: hrForm.position.trim(),
      },
    });
  }

  if (!activeUser || isError) {
    return null;
  }

  const fullName = getFullName(activeUser);
  const isCreateMode = formMode === 'create';

  return (
    <AdminLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      section={activeUser.section || 'Administration'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageEyebrow="Admin workspace"
      pageTitle="HR Accounts"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="mx-auto w-full max-w-[15.68rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[0.288rem] border border-[#c9d7db] bg-[linear-gradient(135deg,rgba(251,254,254,0.97)_0%,rgba(238,245,246,0.95)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(54,79,92,0.07)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#6f8d99]">
                HR access control
              </p>
              <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.05em] text-[#173b47]">
                Create HR accounts for people who manage workforce, onboarding, and payroll.
              </h1>
            </div>
            <button
              type="button"
              onClick={startCreating}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105"
            >
              <FiPlus className="h-4 w-4" />
              Add HR account
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[0.272rem] border border-[#c9d7db] bg-[rgba(251,254,254,0.92)] p-5 shadow-[0_14px_28px_rgba(54,79,92,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#173b47]">HR account list</p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607c88]">
                HR users can sign in to the dedicated HR portal.
              </p>
            </div>
            <label className="flex min-w-0 items-center gap-3 rounded-[0.16rem] border border-[#c9d7db] bg-white px-4 py-2.5 text-[#6f8d99] lg:w-[4rem]">
              <FiSearch className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search HR accounts"
                className="w-full bg-transparent text-fluid-base text-[#21485a] outline-none placeholder:text-[#8aa0a8]"
              />
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-[0.232rem] border border-[#d7e2e6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,249,250,0.96)_100%)]">
            {adminOverviewQuery.isLoading ? (
              <EmptyState title="Loading HR accounts..." description="Accounts are being prepared." />
            ) : filteredHrUsers.length ? (
              <div className="scrollbar-super-thin overflow-auto">
                <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <TableHeadCell className="w-[28%] rounded-tl-[0.232rem]">HR account</TableHeadCell>
                      <TableHeadCell className="w-[18%]">Department</TableHeadCell>
                      <TableHeadCell className="w-[20%]">Contact</TableHeadCell>
                      <TableHeadCell className="w-[15%]">Hire date</TableHeadCell>
                      <TableHeadCell className="w-[11%]">Status</TableHeadCell>
                      <TableHeadCell className="w-[8%] rounded-tr-[0.232rem] text-right">Edit</TableHeadCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHrUsers.map((hrUser, index) => (
                      <tr
                        key={hrUser.id}
                        className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbfc]/92'}
                      >
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-md font-semibold text-[#173b47]">
                            {hrUser.fullName}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#7b95a1]">
                            {hrUser.employeeNumber || '@' + hrUser.username}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm font-semibold text-[#4d6a77]">
                            {hrUser.department || hrUser.section}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#7b95a1]">
                            {hrUser.position}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm font-semibold text-[#4d6a77]">
                            {hrUser.email}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#7b95a1]">
                            {hrUser.contactNumber}
                          </p>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-fluid-sm text-[#5f7884]">
                          {formatDate(hrUser.hireDate)}
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-[#d1dde1] bg-white px-3 py-1 text-fluid-xs font-semibold capitalize text-[#5a7885]">
                            {hrUser.employmentStatus.replace('-', ' ')}
                          </span>
                        </td>
                        <td className="border-b border-[#dce6e9] px-4 py-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => startEditing(hrUser)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[0.152rem] border border-[#d2dee2] bg-white text-[#52707d] transition hover:bg-[#f8fbfb]"
                            aria-label={`Edit ${hrUser.fullName}`}
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
              <EmptyState title="No HR accounts found" description="Create the first HR account to open the HR portal." />
            )}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(formMode)}
        title={isCreateMode ? 'Add HR account' : selectedHrUser ? `Edit ${selectedHrUser.fullName}` : 'Edit HR account'}
        description={isCreateMode ? 'Create portal credentials and an employment profile.' : 'Update HR access details, employment info, or reset the password.'}
        onClose={resetModal}
        panelClassName="max-w-5xl"
        bodyClassName="scrollbar-super-thin max-h-[70vh] overflow-auto bg-[rgba(244,250,248,0.68)] px-5 py-5 sm:px-6"
        actions={(
          <>
            <button
              type="button"
              onClick={resetModal}
              className="inline-flex items-center justify-center rounded-[0.16rem] border border-[#b7c7d6] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#48617d] transition hover:bg-[#f8fbfb]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveHrAccount}
              disabled={saveHrMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#1f8a78] bg-[linear-gradient(180deg,#27a18f_0%,#1a7b6f_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiUserCheck className="h-4 w-4" />
              {saveHrMutation.isPending ? 'Saving...' : isCreateMode ? 'Create account' : 'Save changes'}
            </button>
          </>
        )}
      >
        <div className="space-y-4">
          <FormSection
            eyebrow="Identity"
            title="Personal profile"
            description="Use the legal name and contact details that HR will recognize."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InputField label="Last name" error={fieldErrors.lastName}>
                <input type="text" value={hrForm.lastName} onChange={(event) => updateFormField('lastName', event.target.value)} className="admin-text-input" />
              </InputField>
              <InputField label="First name" error={fieldErrors.firstName}>
                <input type="text" value={hrForm.firstName} onChange={(event) => updateFormField('firstName', event.target.value)} className="admin-text-input" />
              </InputField>
              <InputField label="Middle name" error={fieldErrors.middleName}>
                <input type="text" value={hrForm.middleName} onChange={(event) => updateFormField('middleName', event.target.value)} className="admin-text-input" />
              </InputField>
              <InputField label="Birthdate" error={fieldErrors.birthdate}>
                <input type="date" value={hrForm.birthdate} onChange={(event) => updateFormField('birthdate', event.target.value)} className="admin-text-input" />
              </InputField>
            </div>
          </FormSection>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
            <FormSection
              eyebrow="Login"
              title="Account access"
              description="Credentials and portal status."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InputField label="Email" error={fieldErrors.email}>
                  <input type="email" value={hrForm.email} onChange={(event) => updateFormField('email', event.target.value)} className="admin-text-input" />
                </InputField>
                <InputField label="Username" error={fieldErrors.username}>
                  <input type="text" value={hrForm.username} onChange={(event) => updateFormField('username', event.target.value)} className="admin-text-input" />
                </InputField>
                <InputField label={isCreateMode ? 'Password' : 'New password'} error={fieldErrors.password}>
                  <input type="password" value={hrForm.password} onChange={(event) => updateFormField('password', event.target.value)} placeholder={isCreateMode ? '' : 'Optional'} className="admin-text-input" />
                </InputField>
                <InputField label="Status" error={fieldErrors.employmentStatus}>
                  <CustomSelect id="admin-hr-status" value={hrForm.employmentStatus} onChange={(value) => updateFormField('employmentStatus', value)} options={statusOptions} placeholder="Choose status" tone="muted" />
                </InputField>
              </div>
            </FormSection>

            <FormSection
              eyebrow="Employment"
              title="Role and payroll"
              description="Department, title, hire date, and pay setup."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InputField label="Department" error={fieldErrors.section}>
                  <input type="text" value={hrForm.section} onChange={(event) => updateFormField('section', event.target.value)} className="admin-text-input" />
                </InputField>
                <InputField label="Position" error={fieldErrors.position}>
                  <input type="text" value={hrForm.position} onChange={(event) => updateFormField('position', event.target.value)} className="admin-text-input" />
                </InputField>
                <InputField label="Employee number" error={fieldErrors.employeeNumber}>
                  <input type="text" value={hrForm.employeeNumber} onChange={(event) => updateFormField('employeeNumber', event.target.value)} placeholder="Auto if blank" className="admin-text-input" />
                </InputField>
                <InputField label="Hire date" error={fieldErrors.hireDate}>
                  <input type="date" value={hrForm.hireDate} onChange={(event) => updateFormField('hireDate', event.target.value)} className="admin-text-input" />
                </InputField>
                <InputField label="Pay schedule" error={fieldErrors.paySchedule}>
                  <CustomSelect id="admin-hr-pay-schedule" value={hrForm.paySchedule} onChange={(value) => updateFormField('paySchedule', value)} options={payScheduleOptions} placeholder="Choose schedule" tone="muted" />
                </InputField>
                <InputField label="Salary rate" error={fieldErrors.salaryRate}>
                  <input type="number" min="0" value={hrForm.salaryRate} onChange={(event) => updateFormField('salaryRate', event.target.value)} className="admin-text-input" />
                </InputField>
              </div>
            </FormSection>
          </div>

          <FormSection
            eyebrow="Contact"
            title="Reach and emergency details"
            description="Primary phone, emergency contact, and mailing address."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <InputField label="Contact" error={fieldErrors.contactNumber}>
                <input type="text" value={hrForm.contactNumber} onChange={(event) => updateFormField('contactNumber', event.target.value)} className="admin-text-input" />
              </InputField>
              <InputField label="Emergency contact" error={fieldErrors.emergencyContactName}>
                <input type="text" value={hrForm.emergencyContactName} onChange={(event) => updateFormField('emergencyContactName', event.target.value)} className="admin-text-input" />
              </InputField>
              <InputField label="Emergency number" error={fieldErrors.emergencyContactNumber}>
                <input type="text" value={hrForm.emergencyContactNumber} onChange={(event) => updateFormField('emergencyContactNumber', event.target.value)} className="admin-text-input" />
              </InputField>
              <div className="lg:col-span-3">
                <InputField label="Address" error={fieldErrors.address}>
                  <textarea rows={3} value={hrForm.address} onChange={(event) => updateFormField('address', event.target.value)} className="admin-text-input min-h-[0.96rem] resize-y rounded-[0.16rem]" />
                </InputField>
              </div>
            </div>
          </FormSection>
        </div>
      </Modal>
    </AdminLayout>
  );
}

function FormSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[0.208rem] border border-[#d2e0e2] bg-[rgba(255,255,255,0.76)] p-4 shadow-[0_12px_28px_rgba(54,79,92,0.045)]">
      <div className="mb-4 border-b border-[#e0eaec] pb-3">
        <p className="text-fluid-3xs font-semibold uppercase tracking-[0.22em] text-[#2f9d8f]">
          {eyebrow}
        </p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h4 className="text-fluid-base font-semibold tracking-[-0.02em] text-[#173b47]">
            {title}
          </h4>
          <p className="max-w-[4.8rem] text-fluid-xs leading-5 text-[#6b8590] sm:text-right">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
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
    <div className="min-w-0">
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

export default AdminHR;
