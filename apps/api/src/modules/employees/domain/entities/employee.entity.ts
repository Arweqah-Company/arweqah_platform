import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../../common/domain/base.entity';

/**
 * The HR record of a person. `users` (Better Auth) is the sign-in identity; the two are 1:1.
 * National ID, IBAN and salary are stored encrypted (FieldCipher). The ID number is searched and
 * kept unique through `id_number_hash` (keyed HMAC), never through the ciphertext.
 * Foreign keys to other modules' tables are constraint-only relations by entity name.
 */
@Entity('employees')
@Check('CHK_employees_dates', 'end_date IS NULL OR end_date > start_date')
@Check('CHK_employees_not_own_manager', 'manager_id IS NULL OR manager_id <> id')
@Check('CHK_employees_gosi', 'is_gosi_registered OR (gosi_registration_date IS NULL AND gosi_system_id IS NULL)')
@Check('CHK_employees_health_insurance', 'has_medical_insurance OR health_insurance_company_id IS NULL')
@Index('UQ_employees_work_email', ['workEmail'], { unique: true, where: 'deleted_at IS NULL' })
@Index('UQ_employees_number', ['employeeNumber'], { unique: true, where: 'deleted_at IS NULL' })
@Index('UQ_employees_id_document', ['idTypeId', 'idNumberHash'], { unique: true, where: 'deleted_at IS NULL AND id_number_hash IS NOT NULL' })
export class Employee extends SoftDeletableEntity {
  @Index('UQ_employees_user', { unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** Seeded first admin: exists before any org structure, so unit and title are not enforced for it. */
  @Column({ name: 'is_system_account', type: 'boolean', default: false })
  isSystemAccount: boolean;

  // ---- Work
  @Index('IDX_employees_company')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'relation_type_id', type: 'uuid', nullable: true })
  relationTypeId: string | null;

  @Index('IDX_employees_org_node')
  @Column({ name: 'org_node_id', type: 'uuid', nullable: true })
  orgNodeId: string | null;

  @Index('IDX_employees_job_title')
  @Column({ name: 'job_title_id', type: 'uuid', nullable: true })
  jobTitleId: string | null;

  @Index('IDX_employees_manager')
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ name: 'work_location', type: 'varchar', length: 255, nullable: true })
  workLocation: string | null;

  @Column({ name: 'work_country_id', type: 'uuid', nullable: true })
  workCountryId: string | null;

  /** 0 on-site, 1 hybrid, 2 remote. */
  @Column({ name: 'work_mode', type: 'smallint', nullable: true })
  workMode: number | null;

  // ---- Contact
  @Column({ name: 'work_email', type: 'varchar', length: 255 })
  workEmail: string;

  @Column({ name: 'personal_email', type: 'varchar', length: 255, nullable: true })
  personalEmail: string | null;

  @Column({ name: 'work_phone', type: 'varchar', length: 20, nullable: true })
  workPhone: string | null;

  @Column({ name: 'personal_phone', type: 'varchar', length: 20, nullable: true })
  personalPhone: string | null;

  // ---- Personal
  @Column({ name: 'employee_number', type: 'varchar', length: 50 })
  employeeNumber: string;

  @Index('IDX_employees_full_name')
  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName: string;

  @Column({ name: 'full_name_en', type: 'varchar', length: 255, nullable: true })
  fullNameEn: string | null;

  /** 0 male, 1 female. */
  @Column({ type: 'smallint', nullable: true })
  gender: number | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ name: 'nationality_id', type: 'uuid', nullable: true })
  nationalityId: string | null;

  @Column({ name: 'marital_status_id', type: 'uuid', nullable: true })
  maritalStatusId: string | null;

  @Column({ name: 'residency_status_id', type: 'uuid', nullable: true })
  residencyStatusId: string | null;

  @Column({ name: 'id_type_id', type: 'uuid', nullable: true })
  idTypeId: string | null;

  @Column({ name: 'id_number_enc', type: 'text', nullable: true })
  idNumberEnc: string | null;

  @Column({ name: 'id_number_hash', type: 'varchar', length: 64, nullable: true })
  idNumberHash: string | null;

  @Index('IDX_employees_id_expiry')
  @Column({ name: 'id_expiry_date', type: 'date', nullable: true })
  idExpiryDate: string | null;

  // ---- Contract
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  /** Set when sign-in was ended because the contract ended (the day after the end date); cleared when the end date is removed or moved and access comes back. */
  @Column({ name: 'access_ended_at', type: 'timestamptz', nullable: true })
  accessEndedAt: Date | null;

  @Index('IDX_employees_end_date')
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'contract_type_id', type: 'uuid', nullable: true })
  contractTypeId: string | null;

  @Column({ name: 'contract_type_other', type: 'varchar', length: 255, nullable: true })
  contractTypeOther: string | null;

  @Column({ name: 'contract_company_id', type: 'uuid', nullable: true })
  contractCompanyId: string | null;

  @Column({ name: 'gosi_company_id', type: 'uuid', nullable: true })
  gosiCompanyId: string | null;

  @Column({ name: 'health_insurance_company_id', type: 'uuid', nullable: true })
  healthInsuranceCompanyId: string | null;

  @Column({ name: 'is_gosi_registered', type: 'boolean', default: false })
  isGosiRegistered: boolean;

  @Column({ name: 'gosi_registration_date', type: 'date', nullable: true })
  gosiRegistrationDate: string | null;

  @Column({ name: 'gosi_system_id', type: 'uuid', nullable: true })
  gosiSystemId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profession: string | null;

  @Column({ name: 'is_qiwa_contract', type: 'boolean', default: false })
  isQiwaContract: boolean;

  @Column({ name: 'has_medical_insurance', type: 'boolean', default: false })
  hasMedicalInsurance: boolean;

  @Column({ name: 'termination_reason_id', type: 'uuid', nullable: true })
  terminationReasonId: string | null;

  @Column({ name: 'termination_reason_other', type: 'varchar', length: 255, nullable: true })
  terminationReasonOther: string | null;

  // ---- Salary and cost (encrypted)
  @Column({ name: 'monthly_gross_salary_enc', type: 'text', nullable: true })
  monthlyGrossSalaryEnc: string | null;

  @Column({ name: 'salary_currency_country_id', type: 'uuid', nullable: true })
  salaryCurrencyCountryId: string | null;

  @Column({ name: 'iban_enc', type: 'text', nullable: true })
  ibanEnc: string | null;

  // ---- Log
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  // ---- Constraint-only relations
  @ManyToOne('User', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_employees_user' })
  private readonly userFk?: unknown;

  @ManyToOne('Company')
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_employees_company' })
  private readonly companyFk?: unknown;

  @ManyToOne('RelationType')
  @JoinColumn({ name: 'relation_type_id', foreignKeyConstraintName: 'FK_employees_relation_type' })
  private readonly relationTypeFk?: unknown;

  @ManyToOne('OrgNode')
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_employees_org_node' })
  private readonly orgNodeFk?: unknown;

  @ManyToOne('JobTitle')
  @JoinColumn({ name: 'job_title_id', foreignKeyConstraintName: 'FK_employees_job_title' })
  private readonly jobTitleFk?: unknown;

  @ManyToOne('Employee', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id', foreignKeyConstraintName: 'FK_employees_manager' })
  private readonly managerFk?: unknown;

  @ManyToOne('Country')
  @JoinColumn({ name: 'work_country_id', foreignKeyConstraintName: 'FK_employees_work_country' })
  private readonly workCountryFk?: unknown;

  @ManyToOne('Country')
  @JoinColumn({ name: 'nationality_id', foreignKeyConstraintName: 'FK_employees_nationality' })
  private readonly nationalityFk?: unknown;

  @ManyToOne('MaritalStatus')
  @JoinColumn({ name: 'marital_status_id', foreignKeyConstraintName: 'FK_employees_marital_status' })
  private readonly maritalStatusFk?: unknown;

  @ManyToOne('ResidencyStatus')
  @JoinColumn({ name: 'residency_status_id', foreignKeyConstraintName: 'FK_employees_residency_status' })
  private readonly residencyStatusFk?: unknown;

  @ManyToOne('IdType')
  @JoinColumn({ name: 'id_type_id', foreignKeyConstraintName: 'FK_employees_id_type' })
  private readonly idTypeFk?: unknown;

  @ManyToOne('ContractType')
  @JoinColumn({ name: 'contract_type_id', foreignKeyConstraintName: 'FK_employees_contract_type' })
  private readonly contractTypeFk?: unknown;

  @ManyToOne('Company')
  @JoinColumn({ name: 'contract_company_id', foreignKeyConstraintName: 'FK_employees_contract_company' })
  private readonly contractCompanyFk?: unknown;

  @ManyToOne('Company')
  @JoinColumn({ name: 'gosi_company_id', foreignKeyConstraintName: 'FK_employees_gosi_company' })
  private readonly gosiCompanyFk?: unknown;

  @ManyToOne('Company')
  @JoinColumn({ name: 'health_insurance_company_id', foreignKeyConstraintName: 'FK_employees_health_company' })
  private readonly healthCompanyFk?: unknown;

  @ManyToOne('GosiSystem')
  @JoinColumn({ name: 'gosi_system_id', foreignKeyConstraintName: 'FK_employees_gosi_system' })
  private readonly gosiSystemFk?: unknown;

  @ManyToOne('TerminationReason')
  @JoinColumn({ name: 'termination_reason_id', foreignKeyConstraintName: 'FK_employees_termination_reason' })
  private readonly terminationReasonFk?: unknown;

  @ManyToOne('Country')
  @JoinColumn({ name: 'salary_currency_country_id', foreignKeyConstraintName: 'FK_employees_salary_currency' })
  private readonly salaryCurrencyFk?: unknown;
}
