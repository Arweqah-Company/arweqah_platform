import type { OrgCharter, LocalizedList, TitleTrack } from '@arweqah-platform/shared';
import { Check, Column, Entity, Exclusion, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { BaseEntity, SoftDeletableEntity } from '../../../../common/domain/base.entity';
import { DatedChangeEntity } from '../../../../common/domain/dated-change.entity';
import { LookupEntity, TranslationEntity } from '../../../../common/domain/lookup.entity';

/** A company of the group. The structure (types, units, job titles) is one for the whole group. */
@Entity('companies')
export class Company extends SoftDeletableEntity {
  @Index('UQ_companies_code', { unique: true, where: 'deleted_at IS NULL' })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}

@Entity('company_translations')
@Unique('UQ_company_translations', ['companyId', 'lang'])
export class CompanyTranslation extends TranslationEntity {
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_company_translations_parent' })
  private readonly parentFk?: unknown;
}

/** The built-in unit types and their defaults (sector, department, section, unit, office). */
@Entity('org_level_templates')
export class OrgLevelTemplate extends LookupEntity {
  @Column({ name: 'is_assignable', type: 'boolean', default: false })
  isAssignable: boolean;
}

@Entity('org_level_template_translations')
@Unique('UQ_org_level_template_translations', ['orgLevelTemplateId', 'lang'])
export class OrgLevelTemplateTranslation extends TranslationEntity {
  @Column({ name: 'org_level_template_id', type: 'uuid' })
  orgLevelTemplateId: string;

  @ManyToOne('OrgLevelTemplate', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_level_template_id', foreignKeyConstraintName: 'FK_org_level_template_translations_parent' })
  private readonly parentFk?: unknown;
}

/** One unit type of the group's structure (sector, department, section, unit, office, or a type an administrator added). Types are not ordered: who may sit under whom is `org_level_parents`. */
@Entity('org_levels')
@Index('UQ_org_levels_order', ['sortOrder'], { unique: true, where: 'deleted_at IS NULL' })
@Index('UQ_org_levels_key', ['templateCode'], { unique: true, where: 'deleted_at IS NULL' })
export class OrgLevel extends SoftDeletableEntity {
  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  /** Job titles and employees attach only to types that accept them (a sector never does). */
  @Column({ name: 'is_assignable', type: 'boolean', default: false })
  isAssignable: boolean;

  /** The stable key of the type (`sector`, `department`, `section`, `unit`, `office`, or `custom_xxxxxx`); `department` is the one that can receive tickets. */
  @Column({ name: 'template_code', type: 'varchar', length: 30 })
  templateCode: string;

  /** The five built-in types cannot be removed. */
  @Column({ name: 'is_built_in', type: 'boolean', default: false })
  isBuiltIn: boolean;

  /** Colour family in the UI: the built-in key, or `unit` for an added type. */
  @Column({ type: 'varchar', length: 20, default: 'unit' })
  tone: string;

  /** The slot the type takes in a unit code (1 sector, 2 department, 3 section, 4 unit and added types); null for the office. */
  @Column({ name: 'code_slot', type: 'int', nullable: true })
  codeSlot: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}

/** «Who may be created under whom»: a row allows a child type under a parent type; a null parent is the group root. */
@Entity('org_level_parents')
@Index('UQ_org_level_parents_pair', ['parentLevelId', 'childLevelId'], { unique: true })
@Index('UQ_org_level_parents_root', ['childLevelId'], { unique: true, where: 'parent_level_id IS NULL' })
export class OrgLevelParent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parent_level_id', type: 'uuid', nullable: true })
  parentLevelId: string | null;

  @Index('IDX_org_level_parents_child')
  @Column({ name: 'child_level_id', type: 'uuid' })
  childLevelId: string;

  @ManyToOne('OrgLevel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_level_id', foreignKeyConstraintName: 'FK_org_level_parents_parent' })
  private readonly parentFk?: unknown;

  @ManyToOne('OrgLevel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_level_id', foreignKeyConstraintName: 'FK_org_level_parents_child' })
  private readonly childFk?: unknown;
}

@Entity('org_level_translations')
@Unique('UQ_org_level_translations', ['orgLevelId', 'lang'])
export class OrgLevelTranslation extends TranslationEntity {
  @Column({ name: 'org_level_id', type: 'uuid' })
  orgLevelId: string;

  @ManyToOne('OrgLevel', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_level_id', foreignKeyConstraintName: 'FK_org_level_translations_parent' })
  private readonly parentFk?: unknown;
}

/** A unit in the group's tree (`company_id` is the group company). Ancestry lives in `org_node_closure` for subtree queries. */
@Entity('org_nodes')
export class OrgNode extends SoftDeletableEntity {
  @Index('IDX_org_nodes_company')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Index('IDX_org_nodes_level')
  @Column({ name: 'org_level_id', type: 'uuid' })
  orgLevelId: string;

  @Index('IDX_org_nodes_parent')
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Index('IDX_org_nodes_manager')
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** The unit code (`OPS.03.03.01`), built by type when the unit is created and never changed by moving it; null for a unit created before codes existed. */
  @Index('UQ_org_nodes_code', { unique: true, where: 'code IS NOT NULL AND deleted_at IS NULL' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  /** `shared`, `per_company`, or null = inherit from the closest ancestor that has one. */
  @Column({ name: 'management_mode', type: 'varchar', length: 20, nullable: true })
  managementMode: 'shared' | 'per_company' | null;

  /** The day the unit started working. */
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  /** The charter in force today (the daily copy of the current version, FR-99); null until one is written. */
  @Column({ type: 'jsonb', nullable: true })
  charter: OrgCharter | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne('Company')
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_org_nodes_company' })
  private readonly companyFk?: unknown;

  @ManyToOne('OrgLevel')
  @JoinColumn({ name: 'org_level_id', foreignKeyConstraintName: 'FK_org_nodes_level' })
  private readonly levelFk?: unknown;

  @ManyToOne('OrgNode')
  @JoinColumn({ name: 'parent_id', foreignKeyConstraintName: 'FK_org_nodes_parent' })
  private readonly parentFk?: unknown;

  @ManyToOne('Employee', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id', foreignKeyConstraintName: 'FK_org_nodes_manager' })
  private readonly managerFk?: unknown;
}

@Entity('org_node_translations')
@Unique('UQ_org_node_translations', ['orgNodeId', 'lang'])
export class OrgNodeTranslation extends TranslationEntity {
  @Column({ name: 'org_node_id', type: 'uuid' })
  orgNodeId: string;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_org_node_translations_parent' })
  private readonly parentFk?: unknown;
}

/** Every (ancestor, descendant) pair of the tree, including each node with itself at depth 0. */
@Entity('org_node_closure')
export class OrgNodeClosure {
  @PrimaryColumn({ name: 'ancestor_id', type: 'uuid' })
  ancestorId: string;

  @Index('IDX_org_node_closure_descendant')
  @PrimaryColumn({ name: 'descendant_id', type: 'uuid' })
  descendantId: string;

  @Column({ type: 'int' })
  depth: number;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ancestor_id', foreignKeyConstraintName: 'FK_org_node_closure_ancestor' })
  private readonly ancestorFk?: unknown;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'descendant_id', foreignKeyConstraintName: 'FK_org_node_closure_descendant' })
  private readonly descendantFk?: unknown;
}

/** A job title of a unit. The code, grade and track are null on titles made before codes existed (HR fills them in; nothing is guessed). */
@Entity('job_titles')
@Check('CHK_job_titles_grade', 'grade IS NULL OR (grade >= 1 AND grade <= 9)')
@Check('CHK_job_titles_track', `track IS NULL OR track IN ('M', 'P', 'J', 'C', 'S')`)
@Check('CHK_job_titles_grade_track', '(grade IS NULL) = (track IS NULL)')
@Check('CHK_job_titles_reports_to_self', 'reports_to_title_id IS NULL OR reports_to_title_id <> id')
@Index('UQ_job_titles_code', ['code'], { unique: true, where: 'code IS NOT NULL' })
export class JobTitle extends SoftDeletableEntity {
  @Index('IDX_job_titles_node')
  @Column({ name: 'org_node_id', type: 'uuid' })
  orgNodeId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** `OPS.03.03.01-L7P-01`: unit code, grade, track and a sequence that grows per unit, grade and track. Built once, never changed (never reused, even after the title is deleted). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  code: string | null;

  @Column({ type: 'smallint', nullable: true })
  grade: number | null;

  /** M management, P professional, J projects, C consulting, S support. */
  @Column({ type: 'varchar', length: 1, nullable: true })
  track: TitleTrack | null;

  /** The title this one reports to: the chain that finds an employee's manager. */
  @Index('IDX_job_titles_reports_to')
  @Column({ name: 'reports_to_title_id', type: 'uuid', nullable: true })
  reportsToTitleId: string | null;

  @Column({ type: 'jsonb' })
  responsibilities: LocalizedList;

  @Column({ type: 'jsonb' })
  qualifications: LocalizedList;

  @Column({ type: 'jsonb' })
  kpis: LocalizedList;

  /** Grows with every edit of the content above. */
  @Column({ name: 'content_version', type: 'int', default: 1 })
  contentVersion: number;

  @ManyToOne('OrgNode')
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_job_titles_node' })
  private readonly nodeFk?: unknown;

  @ManyToOne('JobTitle', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reports_to_title_id', foreignKeyConstraintName: 'FK_job_titles_reports_to' })
  private readonly reportsToFk?: unknown;
}

@Entity('job_title_translations')
@Unique('UQ_job_title_translations', ['jobTitleId', 'lang'])
export class JobTitleTranslation extends TranslationEntity {
  @Column({ name: 'job_title_id', type: 'uuid' })
  jobTitleId: string;

  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_title_id', foreignKeyConstraintName: 'FK_job_title_translations_parent' })
  private readonly parentFk?: unknown;
}

/**
 * A dated version of a unit (FR-99): its name, code, switch and charter from `valid_from` to `valid_to` (open-ended while null).
 * The unit keeps the version in force as its current values; a version that starts later waits with `applied_at` empty until the nightly job applies it.
 * Versions of one unit never overlap, and a past one is never rewritten.
 */
@Entity('org_node_versions')
@Check('CHK_org_node_versions_period', 'valid_to IS NULL OR valid_to >= valid_from')
@Exclusion('EXCL_org_node_versions_overlap', `USING gist (node_id WITH =, daterange(valid_from, valid_to, '[]') WITH &&)`)
@Index('IDX_org_node_versions_node', ['nodeId', 'validFrom'])
@Index('IDX_org_node_versions_due', ['validFrom'], { where: 'applied_at IS NULL' })
export class OrgNodeVersion extends DatedChangeEntity {
  @Column({ name: 'node_id', type: 'uuid' })
  nodeId: string;

  @Column({ name: 'valid_from', type: 'date' })
  validFrom: string;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  /** The unit code at that time (a snapshot; the code never changes once set). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  charter: OrgCharter | null;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id', foreignKeyConstraintName: 'FK_org_node_versions_node' })
  private readonly nodeFk?: unknown;
}

/**
 * Who leads a unit for a company, and who acts for them (FR-100). A shared unit has one leader (from the group company); a unit managed per
 * company has one per company. Rows of the same kind for one unit and company never overlap; an acting leader always has a window.
 * `org_nodes.manager_id` keeps the current leader as a copy.
 */
@Entity('org_node_leaders')
@Check('CHK_org_node_leaders_period', 'valid_to IS NULL OR valid_to >= valid_from')
@Check('CHK_org_node_leaders_kind', `kind IN ('leader', 'acting')`)
@Check('CHK_org_node_leaders_acting_window', `kind = 'leader' OR valid_to IS NOT NULL`)
@Exclusion('EXCL_org_node_leaders_overlap', `USING gist (node_id WITH =, company_id WITH =, kind WITH =, daterange(valid_from, valid_to, '[]') WITH &&)`)
@Index('IDX_org_node_leaders_node', ['nodeId', 'validFrom'])
@Index('IDX_org_node_leaders_employee', ['employeeId'])
export class OrgNodeLeader extends BaseEntity {
  @Column({ name: 'node_id', type: 'uuid' })
  nodeId: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ type: 'varchar', length: 10 })
  kind: 'leader' | 'acting';

  @Column({ name: 'valid_from', type: 'date' })
  validFrom: string;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne('OrgNode', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'node_id', foreignKeyConstraintName: 'FK_org_node_leaders_node' })
  private readonly nodeFk?: unknown;

  @ManyToOne('Company')
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_org_node_leaders_company' })
  private readonly companyFk?: unknown;

  @ManyToOne('Employee')
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_org_node_leaders_employee' })
  private readonly employeeFk?: unknown;
}

/** Which development stage a grade (and track) gives (FR-107). A rule with a track wins over one for the grade alone; HR edits the table later. */
@Entity('development_stage_rules')
@Check('CHK_development_stage_rules_grade', 'grade >= 1 AND grade <= 9')
@Index('UQ_development_stage_rules_track', ['grade', 'track'], { unique: true, where: 'track IS NOT NULL' })
@Index('UQ_development_stage_rules_grade', ['grade'], { unique: true, where: 'track IS NULL' })
export class DevelopmentStageRule extends BaseEntity {
  @Column({ type: 'smallint' })
  grade: number;

  /** Null = any track. */
  @Column({ type: 'varchar', length: 1, nullable: true })
  track: TitleTrack | null;

  @Column({ type: 'varchar', length: 40 })
  stage: string;
}

export const ORG_ENTITIES = [
  Company, CompanyTranslation,
  OrgLevelTemplate, OrgLevelTemplateTranslation, OrgLevel, OrgLevelTranslation, OrgLevelParent,
  OrgNode, OrgNodeTranslation, OrgNodeClosure, JobTitle, JobTitleTranslation,
  OrgNodeVersion, OrgNodeLeader, DevelopmentStageRule,
];
