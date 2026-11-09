import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { CorePermission } from '@arweqah-platform/shared';
import { useMyCareer } from './api';

export const CAREER_PROFILE_PATH = '/career-profile';

/**
 * Holds the platform back until the employee has acknowledged their career path: every page leads to the path while the acknowledgement is
 * required (first sign-in, a new title, or reopened by HR); the path page itself and signing out stay open. Never for a «sign in as» session
 * (the server answers `ackRequired: false`). The system account is held like anyone, except while platform admin mode is on.
 */
export function useCareerHold(): boolean {
  const { can } = usePermissions();
  const me = useMyCareer(can(CorePermission.CareerProfileView));
  const adminMode = useMe().data?.adminMode.active === true;
  return !!me.data?.ackRequired && !(me.data.adminModeExempt && adminMode);
}

export function CareerGate({ children }: { children: ReactNode }) {
  const held = useCareerHold();
  const location = useLocation();
  if (held && location.pathname !== CAREER_PROFILE_PATH) return <Navigate to={CAREER_PROFILE_PATH} replace />;
  return <>{children}</>;
}
