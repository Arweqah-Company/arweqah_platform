import { Injectable } from '@nestjs/common';
import { JobTitlesService } from '../../../org/application/services/job-titles.service';
import { TitleIdentityPort } from '../../domain/contracts/title-identity.port';
import type { TitleIdentity } from '../../domain/types/career-profile.types';

/** The structure module's job titles, seen as the identity this module needs. */
@Injectable()
export class OrgTitleIdentityAdapter extends TitleIdentityPort {
  constructor(private readonly titles: JobTitlesService) {
    super();
  }

  identity(titleId: string): Promise<TitleIdentity> {
    return this.titles.identity(titleId);
  }
}
