import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGuard: Conditionally renders children if the active authenticated role is authorized.
 * Used for in-component UI section access control (e.g. hiding admin actions from customers).
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  const hasAccess = allowedRoles.includes(role);
  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;
