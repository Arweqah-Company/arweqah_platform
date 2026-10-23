import { Entity } from 'typeorm';
import { NamedEntity } from '../../../common/domain/named.entity';

/** A group of people chosen one by one, who all get the permissions placed on the group. */
@Entity('user_groups')
export class UserGroup extends NamedEntity {}
