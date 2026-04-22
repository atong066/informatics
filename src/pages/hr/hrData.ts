import { useQuery } from '@tanstack/react-query';
import { useCurrentStudent } from '../../hooks/useCurrentStudent';
import { getStoredToken } from '../../lib/auth';

export type HrEmployeeRole = 'faculty' | 'staff';
export type EmploymentStatus = 'onboarding' | 'active' | 'on-leave' | 'inactive';
export type PaySchedule = 'monthly' | 'semi-monthly' | 'hourly';
export type PayrollStatus = 'draft' | 'approved' | 'paid';

export type HrEmployee = {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string;
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  username: string;
  role: HrEmployeeRole;
  department: string;
  section: string;
  employeeNumber: string;
  position: string;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  salaryRate: number;
  paySchedule: PaySchedule;
  emergencyContactName: string;
  emergencyContactNumber: string;
  birthdate: string;
  profileImage?: string | null;
};

export type HrOnboardingTask = {
  id: string;
  title: string;
  category: string;
  owner: string;
  dueDate: string;
  isCompleted: boolean;
  completedAt: string;
};

export type HrOnboardingPlan = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: HrEmployeeRole;
  employeeNumber: string;
  department: string;
  stage: 'preboarding' | 'first-week' | 'training' | 'complete';
  status: 'not-started' | 'in-progress' | 'completed';
  startDate: string;
  dueDate: string;
  completedTaskCount: number;
  taskCount: number;
  tasks: HrOnboardingTask[];
};

export type HrPayrollRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: HrEmployeeRole;
  employeeNumber: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  basePay: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  paymentDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type HrOverviewResponse = {
  metrics: {
    employeeCount: number;
    facultyCount: number;
    staffCount: number;
    onboardingCount: number;
    pendingPayrollCount: number;
    payrollThisMonth: number;
  };
  employees: HrEmployee[];
  onboardingPlans: HrOnboardingPlan[];
  payrollRecords: HrPayrollRecord[];
};

async function fetchHrOverview(token: string) {
  const response = await fetch('/api/hr/overview', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = (await response.json()) as {
    message?: string;
    data?: HrOverviewResponse;
  };

  if (!response.ok || !data.data) {
    throw new Error(data.message || 'Failed to load HR overview');
  }

  return data.data;
}

export function useHrOverview() {
  const { activeUser, isError } = useCurrentStudent();
  const token = getStoredToken();
  const hrOverviewQuery = useQuery({
    queryKey: ['hr-overview'],
    queryFn: async () => fetchHrOverview(token ?? ''),
    enabled: Boolean(token && activeUser && !isError),
  });

  return {
    activeUser,
    isError,
    token,
    hrOverviewQuery,
  };
}

export function getFullName(user?: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
} | null) {
  return [user?.firstName, user?.middleName, user?.lastName]
    .filter(Boolean)
    .join(' ');
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
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
