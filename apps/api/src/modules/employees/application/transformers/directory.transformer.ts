import type { DirectoryEntryDto, DirectoryProfileDto } from '@arweqah-platform/shared';
import type { Employee } from '../../domain/entities/employee.entity';

type Names = { id: string; nameAr: string; nameEn: string };
export interface DirectoryNames {
  companies: Map<string, Names>;
  nodes: Map<string, Names & { pathAr: string; pathEn: string }>;
  titles: Map<string, Names>;
}

const UNKNOWN: Names = { id: '', nameAr: '', nameEn: '' };

/** The basics of an employee, and nothing more: no id number, no personal contact, no salary can reach the directory through here. */
export function toDirectoryEntry(e: Employee, names: DirectoryNames): DirectoryEntryDto {
  return {
    id: e.id,
    fullName: e.fullName,
    fullNameEn: e.fullNameEn,
    photoFileId: e.photoFileId,
    company: names.companies.get(e.companyId) ?? UNKNOWN,
    orgNode: e.orgNodeId ? (names.nodes.get(e.orgNodeId) ?? null) : null,
    jobTitle: e.jobTitleId ? (names.titles.get(e.jobTitleId) ?? null) : null,
    workEmail: e.workEmail,
    workPhone: e.workPhone,
  };
}

/** The profile at its level: the work and contact details only from `extended` up. */
export function toDirectoryProfile(e: Employee, names: DirectoryNames, level: DirectoryProfileDto['level'], manager: DirectoryProfileDto['manager']): DirectoryProfileDto {
  const details = level === 'basic' ? null : { workLocation: e.workLocation, workMode: e.workMode as 0 | 1 | 2 | null, startDate: e.startDate, personalPhone: e.personalPhone, personalEmail: e.personalEmail };
  return { ...toDirectoryEntry(e, names), level, manager, details };
}
