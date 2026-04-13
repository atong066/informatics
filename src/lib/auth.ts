export type StoredUser = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  username: string;
  role?: 'student' | 'faculty' | 'admin';
  section: string;
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

  return user?.role === 'faculty' ? 'faculty' : 'student';
}

export function getDefaultPortalRoute(user?: Pick<StoredUser, 'role'> | null) {
  const normalizedRole = getNormalizedRole(user);

  if (normalizedRole === 'admin') {
    return '/admin/dashboard';
  }

  return normalizedRole === 'faculty'
    ? '/faculty/dashboard'
    : '/student/dashboard';
}
