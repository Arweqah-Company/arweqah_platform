import { Module, OnModuleInit } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionCatalog } from '../access/application/permission-catalog';
import { AgentCatalogService } from './application/services/agent-catalog.service';
import { AgentAvailability } from './application/services/agent-availability';
import { AgentCheckService } from './application/services/agent-check.service';
import { AgentFilesService } from './application/services/agent-files.service';
import { AgentVoiceService } from './application/services/agent-voice.service';
import { AgentFormService } from './application/services/agent-form.service';
import { AgentChatService } from './application/services/agent-chat.service';
import { AgentConversationsService } from './application/services/agent-conversations.service';
import { AgentDraftService } from './application/services/agent-draft.service';
import { AgentGuideService } from './application/services/agent-guide.service';
import { AgentExecutor } from './application/services/agent-executor';
import { AgentLookupService } from './application/services/agent-lookup.service';
import { AgentProposalService } from './application/services/agent-proposal.service';
import { AgentRouteReader } from './application/services/agent-route-reader';
import { AgentManual } from './domain/contracts/agent-manual';
import { AgentRepository } from './domain/contracts/agent.repository';
import { AgentConversation, AgentMessage, AgentMessageFile } from './domain/entities/agent.entities';
import { AGENT_PERMISSIONS } from './domain/permissions/agent.permissions';
import { ManualTextAdapter } from './infrastructure/adapters/manual-text.adapter';
import { TypeOrmAgentRepository } from './infrastructure/repositories/typeorm-agent.repository';
import { FilesModule } from '../files/files.module';
import { AgentVoiceController } from './presentation/controllers/agent-voice.controller';
import { AgentFilesController } from './presentation/controllers/agent-files.controller';
import { AgentController } from './presentation/controllers/agent.controller';

/** The platform assistant: a chat that prepares what the employee asks for, from a catalog of the routes, and runs it only after the employee confirms (plan phase 7). */
@Module({
  imports: [DiscoveryModule, FilesModule, TypeOrmModule.forFeature([AgentConversation, AgentMessage, AgentMessageFile])],
  controllers: [AgentController, AgentFilesController, AgentVoiceController],
  providers: [
    { provide: AgentRepository, useClass: TypeOrmAgentRepository },
    { provide: AgentManual, useClass: ManualTextAdapter },
    AgentGuideService,
    AgentAvailability,
    AgentCheckService,
    AgentFormService,
    AgentFilesService,
    AgentVoiceService,
    AgentCatalogService,
    AgentRouteReader,
    AgentExecutor,
    AgentLookupService,
    AgentProposalService,
    AgentChatService,
    AgentDraftService,
    AgentConversationsService,
  ],
  exports: [AgentCatalogService],
})
export class AgentModule implements OnModuleInit {
  constructor(private readonly catalog: PermissionCatalog) {}

  onModuleInit(): void {
    this.catalog.register(AGENT_PERMISSIONS);
  }
}
