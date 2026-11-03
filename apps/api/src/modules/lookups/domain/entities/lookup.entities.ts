import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { LookupEntity, TranslationEntity } from '../../../../common/domain/lookup.entity';

/**
 * Seeded option tables behind the employee form. Translation tables hold `name` per language
 * (Arabic is the fallback). Foreign keys are constraint-only relations by entity name.
 */

@Entity('relation_types')
export class RelationType extends LookupEntity {
  /** A person of this relation (a collaborator) gets the collaborator base role instead of the Employee role, and must have an end date. */
  @Column({ name: 'limited_access', type: 'boolean', default: false })
  limitedAccess: boolean;
}

@Entity('relation_type_translations')
@Unique('UQ_relation_type_translations', ['relationTypeId', 'lang'])
export class RelationTypeTranslation extends TranslationEntity {
  @Column({ name: 'relation_type_id', type: 'uuid' })
  relationTypeId: string;

  @ManyToOne('RelationType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'relation_type_id', foreignKeyConstraintName: 'FK_relation_type_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('countries')
export class Country extends LookupEntity {
  @Column({ name: 'iso_code', type: 'varchar', length: 2 })
  isoCode: string;

  @Column({ name: 'currency_code', type: 'varchar', length: 3 })
  currencyCode: string;
}

@Entity('country_translations')
@Unique('UQ_country_translations', ['countryId', 'lang'])
export class CountryTranslation extends TranslationEntity {
  @Column({ name: 'country_id', type: 'uuid' })
  countryId: string;

  @Column({ name: 'currency_name', type: 'varchar', length: 100 })
  currencyName: string;

  @ManyToOne('Country', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'country_id', foreignKeyConstraintName: 'FK_country_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('marital_statuses')
export class MaritalStatus extends LookupEntity {}

@Entity('marital_status_translations')
@Unique('UQ_marital_status_translations', ['maritalStatusId', 'lang'])
export class MaritalStatusTranslation extends TranslationEntity {
  @Column({ name: 'marital_status_id', type: 'uuid' })
  maritalStatusId: string;

  @ManyToOne('MaritalStatus', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marital_status_id', foreignKeyConstraintName: 'FK_marital_status_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('residency_statuses')
export class ResidencyStatus extends LookupEntity {}

@Entity('residency_status_translations')
@Unique('UQ_residency_status_translations', ['residencyStatusId', 'lang'])
export class ResidencyStatusTranslation extends TranslationEntity {
  @Column({ name: 'residency_status_id', type: 'uuid' })
  residencyStatusId: string;

  @ManyToOne('ResidencyStatus', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'residency_status_id', foreignKeyConstraintName: 'FK_residency_status_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('id_types')
export class IdType extends LookupEntity {
  /** National-style IDs are validated per nationality (home-country ID, GCC ID). */
  @Column({ name: 'requires_country', type: 'boolean', default: false })
  requiresCountry: boolean;
}

@Entity('id_type_translations')
@Unique('UQ_id_type_translations', ['idTypeId', 'lang'])
export class IdTypeTranslation extends TranslationEntity {
  @Column({ name: 'id_type_id', type: 'uuid' })
  idTypeId: string;

  @ManyToOne('IdType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_type_id', foreignKeyConstraintName: 'FK_id_type_translations_parent' })
  private readonly parentFk?: unknown;
}

/** Validation rule of a document type. `country_id` null means the rule applies to the whole type. */
@Entity('id_type_rules')
export class IdTypeRule extends LookupEntity {
  @Column({ name: 'id_type_id', type: 'uuid' })
  idTypeId: string;

  @Column({ name: 'country_id', type: 'uuid', nullable: true })
  countryId: string | null;

  @Column({ type: 'varchar', length: 255 })
  regex: string;

  @Column({ name: 'min_length', type: 'int' })
  minLength: number;

  @Column({ name: 'max_length', type: 'int' })
  maxLength: number;

  /** Extra check on the digits (`luhn` for the Saudi national ID and iqama); null for none. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  checksum: 'luhn' | null;

  @ManyToOne('IdType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_type_id', foreignKeyConstraintName: 'FK_id_type_rules_id_type' })
  private readonly idTypeFk?: unknown;

  @ManyToOne('Country')
  @JoinColumn({ name: 'country_id', foreignKeyConstraintName: 'FK_id_type_rules_country' })
  private readonly countryFk?: unknown;
}

/** `name` holds the error message shown when the number does not match the rule. */
@Entity('id_type_rule_translations')
@Unique('UQ_id_type_rule_translations', ['idTypeRuleId', 'lang'])
export class IdTypeRuleTranslation extends TranslationEntity {
  @Column({ name: 'id_type_rule_id', type: 'uuid' })
  idTypeRuleId: string;

  @ManyToOne('IdTypeRule', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_type_rule_id', foreignKeyConstraintName: 'FK_id_type_rule_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('contract_types')
export class ContractType extends LookupEntity {
  @Column({ name: 'requires_end_date', type: 'boolean', default: false })
  requiresEndDate: boolean;

  @Column({ name: 'is_other', type: 'boolean', default: false })
  isOther: boolean;
}

@Entity('contract_type_translations')
@Unique('UQ_contract_type_translations', ['contractTypeId', 'lang'])
export class ContractTypeTranslation extends TranslationEntity {
  @Column({ name: 'contract_type_id', type: 'uuid' })
  contractTypeId: string;

  @ManyToOne('ContractType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_type_id', foreignKeyConstraintName: 'FK_contract_type_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('gosi_systems')
export class GosiSystem extends LookupEntity {
  /** Calculation conditions, defined with the payroll module. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  conditions: Record<string, unknown>;
}

@Entity('gosi_system_translations')
@Unique('UQ_gosi_system_translations', ['gosiSystemId', 'lang'])
export class GosiSystemTranslation extends TranslationEntity {
  @Column({ name: 'gosi_system_id', type: 'uuid' })
  gosiSystemId: string;

  @ManyToOne('GosiSystem', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gosi_system_id', foreignKeyConstraintName: 'FK_gosi_system_translations_parent' })
  private readonly parentFk?: unknown;
}

@Entity('termination_reasons')
export class TerminationReason extends LookupEntity {
  @Column({ name: 'is_other', type: 'boolean', default: false })
  isOther: boolean;
}

@Entity('termination_reason_translations')
@Unique('UQ_termination_reason_translations', ['terminationReasonId', 'lang'])
export class TerminationReasonTranslation extends TranslationEntity {
  @Column({ name: 'termination_reason_id', type: 'uuid' })
  terminationReasonId: string;

  @ManyToOne('TerminationReason', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'termination_reason_id', foreignKeyConstraintName: 'FK_termination_reason_translations_parent' })
  private readonly parentFk?: unknown;
}

export const LOOKUP_ENTITIES = [
  RelationType, RelationTypeTranslation, Country, CountryTranslation, MaritalStatus, MaritalStatusTranslation,
  ResidencyStatus, ResidencyStatusTranslation, IdType, IdTypeTranslation, IdTypeRule, IdTypeRuleTranslation,
  ContractType, ContractTypeTranslation, GosiSystem, GosiSystemTranslation, TerminationReason, TerminationReasonTranslation,
];
