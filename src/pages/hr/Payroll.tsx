import { type ReactNode, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FiDollarSign, FiEdit3, FiPlus, FiSearch } from 'react-icons/fi';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import NotificationPopup from '../../components/NotificationPopup';
import HRLayout from '../../layout/hr/HRLayout';
import {
  formatCurrency,
  formatDate,
  getFullName,
  type HrOverviewResponse,
  type HrPayrollRecord,
  type PayrollStatus,
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

type PayrollFormState = {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  basePay: string;
  allowances: string;
  deductions: string;
  status: PayrollStatus;
  paymentDate: string;
  notes: string;
};

type SavePayrollPayload = {
  mode: 'create' | 'edit';
  payrollId: string | null;
  form: PayrollFormState;
};

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
];

function emptyPayrollForm(): PayrollFormState {
  return {
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    basePay: '0',
    allowances: '0',
    deductions: '0',
    status: 'draft',
    paymentDate: '',
    notes: '',
  };
}

function buildPayrollForm(record: HrPayrollRecord): PayrollFormState {
  return {
    employeeId: record.employeeId,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    basePay: String(record.basePay),
    allowances: String(record.allowances),
    deductions: String(record.deductions),
    status: record.status,
    paymentDate: record.paymentDate,
    notes: record.notes,
  };
}

function HrPayroll() {
  const queryClient = useQueryClient();
  const { activeUser, isError, token, hrOverviewQuery } = useHrOverview();
  const [searchValue, setSearchValue] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<HrPayrollRecord | null>(null);
  const [payrollForm, setPayrollForm] = useState<PayrollFormState>(emptyPayrollForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const employees = hrOverviewQuery.data?.employees ?? [];
  const payrollRecords = hrOverviewQuery.data?.payrollRecords ?? [];
  const employeeOptions = useMemo(
    () => employees.map((employee) => ({
      value: employee.id,
      label: `${employee.fullName} | ${employee.employeeNumber || employee.role}`,
    })),
    [employees],
  );
  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    if (!normalizedSearch) {
      return payrollRecords;
    }

    return payrollRecords.filter((record) =>
      [
        record.employeeName,
        record.employeeNumber,
        record.department,
        record.status,
        record.periodStart,
        record.periodEnd,
      ].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [payrollRecords, searchValue]);
  const netPayPreview = Math.max(
    0,
    Number(payrollForm.basePay || 0) +
      Number(payrollForm.allowances || 0) -
      Number(payrollForm.deductions || 0),
  );

  const savePayrollMutation = useMutation({
    mutationFn: async (payload: SavePayrollPayload) => {
      const endpoint = payload.mode === 'create'
        ? '/api/hr/payroll'
        : `/api/hr/payroll/${payload.payrollId}`;
      const response = await fetch(endpoint, {
        method: payload.mode === 'create' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: payload.form.employeeId,
          periodStart: payload.form.periodStart,
          periodEnd: payload.form.periodEnd,
          basePay: Number(payload.form.basePay || 0),
          allowances: Number(payload.form.allowances || 0),
          deductions: Number(payload.form.deductions || 0),
          status: payload.form.status,
          paymentDate: payload.form.paymentDate,
          notes: payload.form.notes,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        data?: HrOverviewResponse;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !data.data) {
        const error = new Error(data.message || 'Unable to save payroll record') as MutationError;
        error.fieldErrors = Object.fromEntries(
          Object.entries(data.errors ?? {}).map(([key, value]) => [key, value?.[0] ?? '']),
        );
        throw error;
      }

      return {
        mode: payload.mode,
        message: data.message ?? 'Payroll record saved',
        data: data.data,
      };
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['hr-overview'], result.data);
      resetModal();
      setNotification({
        open: true,
        title: result.mode === 'create' ? 'Payroll created' : 'Payroll updated',
        message: result.message,
        variant: 'success',
      });
    },
    onError: (error: MutationError) => {
      setFieldErrors(error.fieldErrors ?? {});
      setNotification({
        open: true,
        title: 'Unable to save payroll',
        message: error.message || 'Review the payroll details and try again.',
        variant: 'error',
      });
    },
  });

  function updateFormField(field: keyof PayrollFormState, value: string) {
    setPayrollForm((current) => ({ ...current, [field]: value } as PayrollFormState));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  }

  function startCreating() {
    setFormMode('create');
    setSelectedRecord(null);
    setPayrollForm(emptyPayrollForm());
    setFieldErrors({});
  }

  function startEditing(record: HrPayrollRecord) {
    setFormMode('edit');
    setSelectedRecord(record);
    setPayrollForm(buildPayrollForm(record));
    setFieldErrors({});
  }

  function resetModal() {
    setFormMode(null);
    setSelectedRecord(null);
    setPayrollForm(emptyPayrollForm());
    setFieldErrors({});
  }

  function savePayroll() {
    const nextErrors: Record<string, string> = {};

    if (!payrollForm.employeeId) {
      nextErrors.employeeId = 'Required';
    }

    if (!payrollForm.periodStart) {
      nextErrors.periodStart = 'Required';
    }

    if (!payrollForm.periodEnd) {
      nextErrors.periodEnd = 'Required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    savePayrollMutation.mutate({
      mode: formMode === 'edit' ? 'edit' : 'create',
      payrollId: selectedRecord?.id ?? null,
      form: payrollForm,
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
      pageTitle="Payroll"
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
                Payroll processing
              </p>
              <h1 className="mt-2 max-w-4xl text-fluid-2xl font-semibold tracking-[-0.04em] text-[#183b25]">
                Prepare pay periods, allowances, deductions, and release status.
              </h1>
            </div>
            <button
              type="button"
              onClick={startCreating}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#2f8a52] bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105"
            >
              <FiPlus className="h-4 w-4" />
              New payroll
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-[0.232rem] border border-[#c8d7ca] bg-[rgba(252,254,252,0.94)] p-5 shadow-[0_14px_28px_rgba(58,88,64,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-fluid-xl font-semibold text-[#183b25]">Payroll ledger</p>
              <p className="mt-2 text-fluid-sm leading-6 text-[#607965]">
                Search pay periods by employee, department, status, or dates.
              </p>
            </div>
            <label className="flex w-full min-w-0 items-center gap-3 rounded-[0.16rem] border border-[#c8d7ca] bg-white px-4 py-2.5 text-[#718f76] lg:w-[4rem]">
              <FiSearch className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search payroll"
                className="w-full bg-transparent text-fluid-base text-[#23452d] outline-none placeholder:text-[#8da594]"
              />
            </label>
          </div>

          <div className="mt-5 overflow-hidden rounded-[0.2rem] border border-[#d5e1d7] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,249,244,0.96)_100%)]">
            {hrOverviewQuery.isLoading ? (
              <EmptyState title="Loading payroll..." description="Payroll records are being prepared." />
            ) : filteredRecords.length ? (
              <div className="scrollbar-super-thin overflow-auto">
                <table className="w-full min-w-[1060px] table-fixed border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <TableHeadCell className="w-[22%] rounded-tl-[0.2rem]">Employee</TableHeadCell>
                      <TableHeadCell className="w-[18%]">Period</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Base</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Allowances</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Deductions</TableHeadCell>
                      <TableHeadCell className="w-[12%]">Net</TableHeadCell>
                      <TableHeadCell className="w-[7%]">Status</TableHeadCell>
                      <TableHeadCell className="w-[5%] rounded-tr-[0.2rem] text-right">Edit</TableHeadCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        className={index % 2 === 0 ? 'bg-white/70' : 'bg-[#f7fbf7]/90'}
                      >
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top">
                          <p className="truncate text-fluid-md font-semibold text-[#183b25]">
                            {record.employeeName}
                          </p>
                          <p className="mt-1 truncate text-fluid-xs text-[#78947d]">
                            {record.employeeNumber || record.department}
                          </p>
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top text-fluid-sm text-[#607965]">
                          {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                        </td>
                        <MoneyCell value={record.basePay} />
                        <MoneyCell value={record.allowances} />
                        <MoneyCell value={record.deductions} />
                        <MoneyCell value={record.netPay} strong />
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top">
                          <span className="inline-flex rounded-full border border-[#cfe0d2] bg-white px-3 py-1 text-fluid-xs font-semibold capitalize text-[#587a60]">
                            {record.status}
                          </span>
                        </td>
                        <td className="border-b border-[#dce7de] px-4 py-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => startEditing(record)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[0.144rem] border border-[#d4e2d7] bg-white text-[#587a60] transition hover:bg-[#f8fbf8]"
                            aria-label={`Edit payroll for ${record.employeeName}`}
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
              <EmptyState title="No payroll records found" description="Create the first pay period when payroll is ready." />
            )}
          </div>
        </section>
      </div>

      <Modal
        open={Boolean(formMode)}
        title={isCreateMode ? 'New payroll record' : selectedRecord ? `Edit ${selectedRecord.employeeName}` : 'Edit payroll'}
        description="Set the pay period, amounts, status, and release date."
        onClose={resetModal}
        panelClassName="max-w-4xl"
        bodyClassName="max-h-[70vh] overflow-auto px-5 py-5 sm:px-6"
        actions={(
          <>
            <button
              type="button"
              onClick={resetModal}
              className="inline-flex items-center justify-center rounded-[0.16rem] border border-[#b7c8bb] bg-white px-4 py-2.5 text-fluid-sm font-semibold text-[#486550] transition hover:bg-[#f8fbf8]"
            >
              Close
            </button>
            <button
              type="button"
              onClick={savePayroll}
              disabled={savePayrollMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-[0.16rem] border border-[#2f8a52] bg-[linear-gradient(180deg,#45a866_0%,#2f7f4d_100%)] px-4 py-2.5 text-fluid-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiDollarSign className="h-4 w-4" />
              {savePayrollMutation.isPending ? 'Saving...' : 'Save payroll'}
            </button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <InputField label="Employee" error={fieldErrors.employeeId}>
              <CustomSelect
                id="payroll-employee"
                value={payrollForm.employeeId}
                onChange={(value) => updateFormField('employeeId', value)}
                options={employeeOptions}
                placeholder={employeeOptions.length ? 'Choose employee' : 'No employees yet'}
                tone="muted"
              />
            </InputField>
          </div>
          <InputField label="Period start" error={fieldErrors.periodStart}>
            <input type="date" value={payrollForm.periodStart} onChange={(event) => updateFormField('periodStart', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Period end" error={fieldErrors.periodEnd}>
            <input type="date" value={payrollForm.periodEnd} onChange={(event) => updateFormField('periodEnd', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Base pay" error={fieldErrors.basePay}>
            <input type="number" min="0" value={payrollForm.basePay} onChange={(event) => updateFormField('basePay', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Allowances" error={fieldErrors.allowances}>
            <input type="number" min="0" value={payrollForm.allowances} onChange={(event) => updateFormField('allowances', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Deductions" error={fieldErrors.deductions}>
            <input type="number" min="0" value={payrollForm.deductions} onChange={(event) => updateFormField('deductions', event.target.value)} className="admin-text-input" />
          </InputField>
          <InputField label="Status" error={fieldErrors.status}>
            <CustomSelect
              id="payroll-status"
              value={payrollForm.status}
              onChange={(value) => updateFormField('status', value as PayrollStatus)}
              options={statusOptions}
              placeholder="Choose status"
              tone="muted"
            />
          </InputField>
          <InputField label="Payment date" error={fieldErrors.paymentDate}>
            <input type="date" value={payrollForm.paymentDate} onChange={(event) => updateFormField('paymentDate', event.target.value)} className="admin-text-input" />
          </InputField>
          <div className="sm:col-span-2">
            <InputField label="Notes" error={fieldErrors.notes}>
              <textarea rows={3} value={payrollForm.notes} onChange={(event) => updateFormField('notes', event.target.value)} className="admin-text-input rounded-[0.16rem]" />
            </InputField>
          </div>
        </div>

        <div className="mt-4 rounded-[0.16rem] border border-[#c8d7ca] bg-white px-4 py-3">
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.18em] text-[#718f76]">
            Net pay preview
          </p>
          <p className="mt-1 text-fluid-xl font-semibold text-[#183b25]">
            {formatCurrency(netPayPreview)}
          </p>
        </div>
      </Modal>
    </HRLayout>
  );
}

function MoneyCell({
  value,
  strong = false,
}: {
  value: number;
  strong?: boolean;
}) {
  return (
    <td className={`border-b border-[#dce7de] px-4 py-4 align-top text-fluid-sm ${strong ? 'font-semibold text-[#315d43]' : 'text-[#607965]'}`}>
      {formatCurrency(value)}
    </td>
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

export default HrPayroll;
