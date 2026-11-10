import { Suspense } from 'react';
import { CareerTeamPanel } from '../career-profile';
import { useTeamParts } from './employees-tabs';
import { TeamTab } from './team-tab';

/** «My career team»: one table. With `career_team.view` it is the career table (the people of the viewer's scope with the numbers of their path), and a viewer who also holds `directory.view` gets the work details as more columns; with `directory.view` only it is the colleagues' table of their own unit. */
export function TeamSection() {
  const { career } = useTeamParts();
  return career ? <Suspense fallback={null}><CareerTeamPanel /></Suspense> : <TeamTab />;
}
