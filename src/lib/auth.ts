export type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  username: string;
  role?: 'student' | 'faculty' | 'admin' | 'hr' | 'staff';
  section: string;
  course?: string;
  batchNumber?: string;
  sectionNumber?: string;
  studentType?: 'new' | 'old';
  completedSubjectIds?: string[];
  studentEvaluation?: {
    status: 'not-required' | 'pending' | 'eligible' | 'blocked';
    evaluatedAt: string;
    remarks: string;
    subjectResults: Array<{
      subjectId: string;
      prerequisiteSubjectIds: string[];
      metPrerequisiteSubjectIds: string[];
      missingPrerequisiteSubjectIds: string[];
      isEligible: boolean;
    }>;
  };
  employeeNumber?: string;
  department?: string;
  position?: string;
  employmentStatus?: string;
  hireDate?: string;
  salaryRate?: number;
  paySchedule?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  birthdate: string;
  address: string;
  contactNumber: string;
  profileImage?: string | null;
};

type AuthSession = {
  token: string;
  user: StoredUser;
};

const STORAGE_KEY = 'informatics-auth';

export function getAuthSession() {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function getStoredUser() {
  return getAuthSession()?.user ?? null;
}

export function getStoredToken() {
  return getAuthSession()?.token ?? null;
}

export function hasStoredSession() {
  const session = getAuthSession();
  return Boolean(session?.token && session.user);
}

export function setAuthSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getNormalizedRole(user?: Pick<StoredUser, 'role'> | null) {
  if (user?.role === 'admin') {
    return 'admin';
  }

  if (user?.role === 'faculty') {
    return 'faculty';
  }

  if (user?.role === 'hr') {
    return 'hr';
  }

  return user?.role === 'staff' ? 'staff' : 'student';
}

export function getDefaultPortalRoute(user?: Pick<StoredUser, 'role'> | null) {
  const normalizedRole = getNormalizedRole(user);

  if (normalizedRole === 'admin') {
    return '/admin/dashboard';
  }

  if (normalizedRole === 'faculty') {
    return '/faculty/dashboard';
  }

  if (normalizedRole === 'hr') {
    return '/hr/dashboard';
  }

  return normalizedRole === 'staff' ? '/staff/dashboard' : '/student/dashboard';
}
