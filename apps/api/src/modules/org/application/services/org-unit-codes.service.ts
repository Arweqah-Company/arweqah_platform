import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { OrgCodePrefixRequiredError, OrgCodeSlotUnavailableError, OrgCodeTakenError } from '../../domain/errors/org.errors';
import { nextUnitCode, rootLevelCode, slotFor } from '../../domain/rules/org-codes.rules';
import type { LevelView, NodeView } from '../../domain/types/org.types';
import { OrgRepository } from '../../domain/contracts/org.repository';

export interface NewUnitCode {
  parent: NodeView | null;
  level: LevelView;
  /** The three letters the creator gave (a sector, or a unit directly under the group). */
  prefix: string | undefined;
}

/** Builds the code of a new unit by its type, inside the creation transaction, under a lock on the parent so two creations never take the same slot. */
@Injectable()
export class OrgUnitCodesService {
  constructor(private readonly repo: OrgRepository) {}

  /** The code, or null when the parent has none yet (it was created before codes existed, so the child cannot be numbered under it). */
  async next(input: NewUnitCode, tx: TransactionContext): Promise<string | null> {
    await this.repo.lockChildren(input.parent?.id ?? null, tx);
    if (!input.parent) return this.rootCode(input.prefix, tx);
    if (!input.parent.code) return null;
    const code = nextUnitCode({
      parentCode: input.parent.code,
      parentType: input.parent.levelKey,
      childType: input.level.key,
      siblingCodes: await this.codesOfTheSameShape(input.parent, input.level.key, tx),
    });
    if (!code) throw new OrgCodeSlotUnavailableError();
    return code;
  }

  /**
   * Every live code a new child could collide with: the parent's code with the slot of the child's type set to any number. A unit keeps its code when it
   * moves, so the codes under this parent's prefix are not only those of its children today (a section that moved to another department still holds its old number).
   */
  private async codesOfTheSameShape(parent: NodeView, childType: string, tx: TransactionContext): Promise<string[]> {
    const slot = slotFor(parent.levelKey, childType);
    if (slot === null || !parent.code) return [];
    const parts = parent.code.split('.');
    parts[slot] = '__';
    return this.repo.codesLike(parts.join('.'), tx);
  }

  private async rootCode(prefix: string | undefined, tx: TransactionContext): Promise<string> {
    const code = prefix ? rootLevelCode(prefix) : null;
    if (!code) throw new OrgCodePrefixRequiredError();
    if (await this.repo.codeTaken(code, tx)) throw new OrgCodeTakenError();
    return code;
  }
}
