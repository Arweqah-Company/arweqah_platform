import { Global, Module } from '@nestjs/common';
import { ReactionsService } from './application/services/reactions.service';
import { ReactionRepository } from './domain/contracts/reaction.repository';
import { TypeOrmReactionRepository } from './infrastructure/repositories/typeorm-reaction.repository';

/** The reactions on ticket replies and task comments (FR-206): the tickets and tasks modules use `ReactionsService`, never its repository. */
@Global()
@Module({
  providers: [ReactionsService, { provide: ReactionRepository, useClass: TypeOrmReactionRepository }],
  exports: [ReactionsService],
})
export class ReactionsModule {}
