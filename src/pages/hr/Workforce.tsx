import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiBriefcase, FiEdit3, FiPlus, FiRefreshCcw, FiSearch, FiUserCheck } from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import HRLayout from '../../layout/hr/HRLayout';
import {
  formatCurrency,
  formatDate,
  getFullName,
  type EmploymentStatus,
  type HrEmployee,
  type HrEmployeeRole,
  type HrOverviewResponse,
  type PaySchedule,
  useHrOverview,
} from './hrData';

type NotificationState = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
};

type MutationError = Error & {
  fieldErrors?: Record<string, string>;
};

type EmployeeFormState = {
  role: HrEmployeeRole;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  contactNumber: string;
  birthdate: string;
  address: string;
  employeeNumber: string;
  department: string;
  position: string;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  salaryRate: string;
  paySchedule: PaySchedule;
  emergencyContactName: string;
  emergencyContactNumber: string;
};

type SaveEmployeePayload = {
  mode: 'create' | 'edit';
  employeeId: string | null;
  form: EmployeeFormState;
};

const roleOptions = [
  { value: 'faculty', label: 'Faculty' },
  { value: 'staff', label: 'Staff' },
];
const statusOptions = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On leave' },
  { value: 'inactive', label: 'Inactive' },
];
const payScheduleOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'semi-monthly', label: 'Semi-monthly' },
  { value: 'hourly', label: 'Hourly' },
];

function emptyEmployeeForm(): EmployeeFormState {
  return {
    role: 'staff',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    contactNumber: '',
    birthdate: '',
    address: '',
    employeeNumber: '',
    department: '',
    position: '',
    employmentStatus: 'onboarding',
    hireDate: '',
    salaryRate: '0',
    paySchedule: 'monthly',
    emergencyContactName: '',
    emergencyContactNumber: '',
  };
}

function buildEmployeeForm(employee: HrEmployee): EmployeeFormState {
  return {
    role: employee.role,
    firstName: employee.firstName,
    middleName: employee.middleName,
    lastName: employee.lastName,
    email: employee.email,
    username: employee.username,
    password: '',
    contactNumber: employee.contactNumber,
    birthdate: employee.birthdate,
    address: employee.address,
    employeeNumber: employee.employeeNumber,
    department: employee.department,
    position: employee.position,
    employmentStatus: employee.employmentStatus,
    hireDate: employee.hireDate,
    salaryRate: String(employee.salaryRate ?? 0),
    paySchedule: employee.paySchedule,
    emergencyContactName: employee.emergencyContactName,
    emergencyContactNumber: employee.emergencyContactNumber,
  };
}

function HrWorkforce() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, hrOverviewQuery } = useHrOverview();
  const [searchValue, setSearchValue] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<HrEmployee | null>(null);
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>(emptyEmployeeForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const employees = hrOverviewQuery.data?.employees ?? [];
  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesRole = !roleFilter || employee.role === roleFilter;
      const matchesSearch = !normalizedSearch || [
        employee.fullName,
        employee.username,
        employee.email,
        employee.employeeNumber,
        employee.department,
        employee.position,
        employee.contactNumber,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesRole && matchesSearch;
    });
  }, [employees, roleFilter, searchValue]);

  const saveEmployeeMutation = useMutation({
    mutationFn: async (payload: SaveEmployeePayload) => {
      const endpoint = payload.mode === 'create'
        ? '/api/hr/employees'
        : `/api/hr/employees/${payload.employeeId}`;
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
        data?: HrOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save employee') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        mode: payload.mode,
        message: data.message ?? 'Employee saved successfully',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['hr-overview'], result.data);
      resetModal();
      setNotification({
        open: true,
        title: result.mode === 'create' ? 'Employee created' : 'Employee updated',
        message: result.message,
        variant: 'success',
      });
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save employee',
        message: error.message || 'Review the employee record and try again.',
        variant: 'error',
      });
    },
  });

  function updateFormField(field: keyof EmployeeFormState, value: string) {
    setEmployeeForm((current) => ({ ...current, [field]: value } as EmployeeFormState));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  }

  function startCreating() {
    setFormMode('create');
    setSelectedEmployee(null);
    setEmployeeForm(emptyEmployeeForm());
    setFieldErrors({});
  }

  function startEditing(employee: HrEmployee) {
    setFormMode('edit');
    setSelectedEmployee(employee);
    setEmployeeForm(buildEmployeeForm(employee));
    setFieldErrors({});
  }

  function resetModal() {
    setFormMode(null);
    setSelectedEmployee(null);
    setEmployeeForm(emptyEmployeeForm());
    setFieldErrors({});
  }

  function saveEmployee() {
    const requiredFields: Array<keyof EmployeeFormState> = [
      'firstName',
      'middleName',
      'lastName',
      'email',
      'username',
      'contactNumber',
      'birthdate',
      'address',
      'department',
      'position',
      'hireDate',
      'salaryRate',
    ];
    const nextErrors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      if (!employeeForm[field].trim()) {
        nextErrors[field] = 'Required';
      }
    });

    if (formMode === 'create' && employeeForm.password.length < 8) {
      nextErrors.password = 'At least 8 characters';
    }

    if (formMode === 'edit' && employeeForm.password && employeeForm.password.length < 8) {
      nextErrors.password = 'At least 8 characters';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    saveEmployeeMutation.mutate({
      mode: formMode === 'edit' ? 'edit' : 'create',
      employeeId: selectedEmployee?.id ?? null,
      form: {
        ...employeeForm,
        email: employeeForm.email.trim(),
        username: employeeForm.username.trim(),
        contactNumber: employeeForm.contactNumber.trim(),
        department: employeeForm.department.trim(),
        position: employeeForm.position.trim(),
        salaryRate: employeeForm.salaryRate.trim(),
      },
    });
  }

  if (!activeUser || isError) {
    return null;
  }

  const fullName = getFullName(activeUser);
  const isCreateMode = formMode === 'create';

  return (
    <HRLayout
      firstName={activeUser.firstName}
      fullName={fullName}
      department={activeUser.department || activeUser.section || 'Human Resources'}
      username={activeUser.username}
      profileImage={activeUser.profileImage}
      pageTitle="Workforce"
    >
      <NotificationPopup
        open={notification.open}
        title={notification.title}
        message={notification.message}
        variant={notification.variant}
        onClose={() => setNotification((current) => ({ ...current, open: false }))}
      />

      <div className="mx-auto w-full max-w-[15.68rem] px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-[0.24rem] border border-[#c8d7ca] bg-[linear-gradient(135deg,rgba(252,254,252,0.98)_0%,rgba(237,245,239,0.96)_100%)] px-5 py-4 shadow-[0_16px_30px_rgba(58,88,64,0.07)] sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-2xs font-semibold uppercase tracking-[0.22em] text-[#718f76]">
                Workforce records
              </p>
              <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.04em] text-[#183b25]">
                Create faculty or staff accounts and keep employment details ready for payroll.
              </h1>
            </div>
            <button
              type="button"
              onClick={startCreating}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#2f8a52] bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105"
            >
              <FiPlus className="h-4 w-4" />
              Add employee
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[0.232rem] border border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] p-5 shadow-[0_14px_28px_rgba(58,88,64,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#183b25]">Employee directory</p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">
                Search employees by name, account, employee number, department, or position.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="w-full sm:w-[2.08rem]">
                <CustomSelect
                  id="workforce-role-filter"
                  value={roleFilter}
                  onChange={setRoleFilter}
                  options={[{ value: '', label: 'All roles' }, ...roleOptions]}
                  placeholder="All roles"
                  tone="muted"
                />
              </div>
              <label className="flex w-full min-w-0 items-center gap-3 rounded-[0.16rem] border border-[#c8d7ca] bg-white px-4 py-2.5 text-[#718f76] sm:w-[3.84rem]">
                <FiSearch className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search workforce"
                  className="w-full bg-transparent text-fluid-base text-[#23452d] outline-none placeholder:text-[#8da594]"
                />
              </label>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[0.2rem] border border-[#d5e1d7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,249,244,0.96)_100%)]">
            {hrOverviewQuery.isLoading ? (
              <EmptyState title="Loading employees..." description="Workforce records are being prepared." />
            ) : filteredEmployees.length ? (
              <div className="scrollbar-super-thin overflow-auto">
                <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <TableHeadCell className="w-[23%] rounded-tl-[0.2rem]">Employee</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Role</TableHeadCell>
                      <TableHeadCell className="w-[16%]">Department</TableHeadCell>
                      <TableHeadCell className="w-[14%]">Status</TableHeadCell>
                      <TableHeadCell className="w-[15%]">Hire date</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Rate</TableHeadCell>
                      <TableHeadCell className="w-[8%] rounded-tr-[0.2rem] text-right">Edit</TableHeadCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employee, index) => (
                      <tr
                        key={employee.id}
                        className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbf7]/90'}
                      >
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top">
                          <p className="truncate text-fluid-md font-semibold text-[#183b25]">
                            {employee.fullName}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#78947d]">
                            {employee.employeeNumber || '@' + employee.username}
                          </p>
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-[#cfe0d2] bg-white px-3 py-1 text-fluid-xs font-semibold capitalize text-[#587a60]">
                            {employee.role}
                          </span>
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top">
                          <p className="truncate text-fluid-sm font-semibold text-[#496b51]">
                            {employee.department}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#78947d]">
                            {employee.position}
                          </p>
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top text-fluid-sm font-semibold capitalize text-[#496b51]">
                          {employee.employmentStatus.replace('-', ' ')}
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top text-fluid-sm text-[#607965]">
                          {formatDate(employee.hireDate)}
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top">
                          <p className="text-fluid-sm font-semibold text-[#315d43]">
                            {formatCurrency(employee.salaryRate)}
                          </p>
                          <p className="mt-1 text-fluid-xs text-[#78947d]">
                            {employee.paySchedule}
                          </p>
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => startEditing(employee)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[0.144rem] border border-[#d4e2d7] bg-white text-[#587a60] transition hover:bg-[#f8fbf8]"
                            aria-label={`Edit ${employee.fullName}`}
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
              <EmptyState title="No employees found" description="Adjust the filters or add a new employee account." />
            )}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(formMode)}
        title={isCreateMode ? 'Add employee' : selectedEmployee ? `Edit ${selectedEmployee.fullName}` : 'Edit employee'}
        description={isCreateMode ? 'Create a faculty or staff account and start onboarding.' : 'Update employment details, status, or reset the password.'}
        onClose={resetModal}
        panelClassName="max-w-5xl"
        bodyClassName="max-h-[70vh] overflow-auto px-5 py-5 sm:px-6"
        actions={(
          <>
            <button
              type="button"
              onClick={resetModal}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#b7c8bb] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#486550] transition hover:bg-[#f8fbf8]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={saveEmployee}
              disabled={saveEmployeeMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#2f8a52] bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiUserCheck className="h-4 w-4" />
              {saveEmployeeMutation.isPending ? 'Saving...' : isCreateMode ? 'Create account' : 'Save changes'}
            </button>
          </>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <InputField label="Account type" error={fieldErrors.role}>
            <CustomSelect
              id="employee-role"
              value={employeeForm.role}
              onChange={(value) => updateFormField('role', value as HrEmployeeRole)}
              options={roleOptions}
              placeholder="Choose role"
              tone="muted"
            />
          </InputField>
          <InputField label="Status" error={fieldErrors.employmentStatus}>
            <CustomSelect
              id="employee-status"
              value={employeeForm.employmentStatus}
              onChange={(value) => updateFormField('employmentStatus', value as EmploymentStatus)}
              options={statusOptions}
              placeholder="Choose status"
              tone="muted"
            />
          </InputField>
          <InputField label="Pay schedule" error={fieldErrors.paySchedule}>
            <CustomSelect
              id="employee-pay-schedule"
              value={employeeForm.paySchedule}
              onChange={(value) => updateFormField('paySchedule', value as PaySchedule)}
              options={payScheduleOptions}
              placeholder="Choose schedule"
              tone="muted"
            />
          </InputField>
          <InputField label="Employee number" error={fieldErrors.employeeNumber}>
            <input
              type="text"
              value={employeeForm.employeeNumber}
              onChange={(event) => updateFormField('employeeNumber', event.target.value)}
              placeholder="Auto if blank"
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Last name" error={fieldErrors.lastName}>
            <input type="text" value={employeeForm.lastName} onChange={(event) => updateFormField('lastName', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="First name" error={fieldErrors.firstName}>
            <input type="text" value={employeeForm.firstName} onChange={(event) => updateFormField('firstName', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Middle name" error={fieldErrors.middleName}>
            <input type="text" value={employeeForm.middleName} onChange={(event) => updateFormField('middleName', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label={isCreateMode ? 'Password' : 'New password'} error={fieldErrors.password}>
            <input
              type="password"
              value={employeeForm.password}
              onChange={(event) => updateFormField('password', event.target.value)}
              placeholder={isCreateMode ? '' : 'Optional'}
              className="admin-text-input"
            />
          </InputField>

          <InputField label="Email" error={fieldErrors.email}>
            <input type="email" value={employeeForm.email} onChange={(event) => updateFormField('email', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Username" error={fieldErrors.username}>
            <input type="text" value={employeeForm.username} onChange={(event) => updateFormField('username', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Contact" error={fieldErrors.contactNumber}>
            <input type="text" value={employeeForm.contactNumber} onChange={(event) => updateFormField('contactNumber', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Birthdate" error={fieldErrors.birthdate}>
            <input type="date" value={employeeForm.birthdate} onChange={(event) => updateFormField('birthdate', event.target.value)} className="admin-text-input" />
          </InputField>

          <InputField label="Department" error={fieldErrors.department}>
            <input type="text" value={employeeForm.department} onChange={(event) => updateFormField('department', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Position" error={fieldErrors.position}>
            <input type="text" value={employeeForm.position} onChange={(event) => updateFormField('position', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Hire date" error={fieldErrors.hireDate}>
            <input type="date" value={employeeForm.hireDate} onChange={(event) => updateFormField('hireDate', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Salary rate" error={fieldErrors.salaryRate}>
            <input type="number" min="0" value={employeeForm.salaryRate} onChange={(event) => updateFormField('salaryRate', event.target.value)} className="admin-text-input" />
          </InputField>

          <div className="lg:col-span-2">
            <InputField label="Emergency contact" error={fieldErrors.emergencyContactName}>
              <input type="text" value={employeeForm.emergencyContactName} onChange={(event) => updateFormField('emergencyContactName', event.target.value)} className="admin-text-input" />
            </InputField>
          </div>
          <div className="lg:col-span-2">
            <InputField label="Emergency contact number" error={fieldErrors.emergencyContactNumber}>
              <input type="text" value={employeeForm.emergencyContactNumber} onChange={(event) => updateFormField('emergencyContactNumber', event.target.value)} className="admin-text-input" />
            </InputField>
          </div>
          <div className="lg:col-span-4">
            <InputField label="Address" error={fieldErrors.address}>
              <textarea
                rows={3}
                value={employeeForm.address}
                onChange={(event) => updateFormField('address', event.target.value)}
                className="admin-text-input rounded-[0.16rem]"
              />
            </InputField>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[0.16rem] border border-[#c8d7ca] bg-white px-4 py-3 text-[#315d43] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-fluid-sm font-semibold">
            <FiBriefcase className="h-4 w-4" />
            {employeeForm.department || 'Department'} | {employeeForm.position || 'Position'}
          </span>
          <button
            type="button"
            onClick={() => setEmployeeForm(emptyEmployeeForm())}
            className="inline-flex items-center justify-center gap-2 rounded-[0.144rem] border border-[#cfe0d2] bg-[#f8fbf8] px-3 py-2 text-fluid-sm font-semibold text-[#587a60] transition hover:bg-white"
          >
            <FiRefreshCcw className="h-4 w-4" />
            Reset form
          </button>
        </div>
      </Modal>
    </HRLayout>
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
        <label className="block text-fluid-sm font-semibold text-[#183b25]">{label}</label>
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
      className={`border-b border-[#d5e1d7] bg-[linear-gradient(180deg,#eef6f0_0%,#e5efe7_100%)] px-4 py-3 text-left text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#718f76] ${className}`}
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
      <p className="text-fluid-md font-semibold text-[#183b25]">{title}</p>
      <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">{description}</p>
    </div>
  );
}

export default HrWorkforce;
