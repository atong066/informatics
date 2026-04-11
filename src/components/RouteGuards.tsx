import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { hasStoredSession } from '../lib/auth';

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
  const storedUser = hasStoredSession();

  if (storedUser) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
}
