import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { SoftDeletableEntity } from '../../../../common/domain/base.entity';
import { LookupEntity, TranslationEntity } from '../../../../common/domain/lookup.entity';

/** A company of the group. Its structure (levels, units, job titles) belongs to it alone. */
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

/** Default divisions copied into every company (sector, department, section, unit). */
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

/** One division of a company's structure. `sort_order` 1 is the top. */
@Entity('org_levels')
@Index('UQ_org_levels_company_order', ['companyId', 'sortOrder'], { unique: true, where: 'deleted_at IS NULL' })
export class OrgLevel extends SoftDeletableEntity {
  @Index('IDX_org_levels_company')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'sort_order', type: 'int' })
  sortOrder: number;

  /** Job titles and employees attach only to assignable levels. */
  @Column({ name: 'is_assignable', type: 'boolean', default: false })
  isAssignable: boolean;

  /** Which default level this came from (`department` is the one that can receive tickets); null for levels the company added. */
  @Column({ name: 'template_code', type: 'varchar', length: 30, nullable: true })
  templateCode: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne('Company')
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_org_levels_company' })
  private readonly companyFk?: unknown;
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

/** A unit in a company's tree. Ancestry lives in `org_node_closure` for subtree queries. */
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

  /** The day the unit started working. */
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

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

@Entity('job_titles')
export class JobTitle extends SoftDeletableEntity {
  @Index('IDX_job_titles_node')
  @Column({ name: 'org_node_id', type: 'uuid' })
  orgNodeId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne('OrgNode')
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_job_titles_node' })
  private readonly nodeFk?: unknown;
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

export const ORG_ENTITIES = [
  Company, CompanyTranslation,
  OrgLevelTemplate, OrgLevelTemplateTranslation, OrgLevel, OrgLevelTranslation,
  OrgNode, OrgNodeTranslation, OrgNodeClosure, JobTitle, JobTitleTranslation,
];
