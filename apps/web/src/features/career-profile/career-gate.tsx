import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { CorePermission } from '@arweqah-platform/shared';
import { useMyCareer } from './api';

export const CAREER_PROFILE_PATH = '/career-profile';

/**
 * Holds the platform back until the employee has acknowledged their career path: every page leads to the path while the acknowledgement is
 * required (first sign-in, a new title, or reopened by HR); the path page itself and signing out stay open. Never for the system account or a
 * «sign in as» session: the server answers `ackRequired: false` for them.
 */
export function CareerGate({ children }: { children: ReactNode }) {
  const { can } = usePermissions();
  const location = useLocation();
  const me = useMyCareer(can(CorePermission.CareerProfileView));
  if (me.data?.ackRequired && location.pathname !== CAREER_PROFILE_PATH) return <Navigate to={CAREER_PROFILE_PATH} replace />;
  return <>{children}</>;
}
