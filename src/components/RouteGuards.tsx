import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getDefaultPortalRoute,
  getNormalizedRole,
  getStoredUser,
  hasStoredSession,
} from '../lib/auth';

type RouteGuardProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: RouteGuardProps) {
  const storedUser = hasStoredSession();

  if (!storedUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function GuestOnlyRoute({ children }: RouteGuardProps) {
  const hasSession = hasStoredSession();
  const storedUser = getStoredUser();

  if (hasSession) {
    return <Navigate to={getDefaultPortalRoute(storedUser)} replace />;
  }

  return <>{children}</>;
}

export function RoleProtectedRoute({
  children,
  role,
}: RouteGuardProps & { role: 'student' | 'faculty' | 'admin' | 'hr' | 'staff' }) {
  const hasSession = hasStoredSession();
  const storedUser = getStoredUser();

  if (!hasSession) {
    return <Navigate to="/login" replace />;
  }

  if (getNormalizedRole(storedUser) !== role) {
    return <Navigate to={getDefaultPortalRoute(storedUser)} replace />;
  }

  return <>{children}</>;
}

export function SessionHomeRedirect() {
  return <Navigate to={getDefaultPortalRoute(getStoredUser())} replace />;
}
