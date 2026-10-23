import { Entity } from 'typeorm';
import { NamedEntity } from '../../../common/domain/named.entity';

/** A named bundle of roles: giving a person the group gives them every role in it. */
@Entity('role_groups')
export class RoleGroup extends NamedEntity {}
