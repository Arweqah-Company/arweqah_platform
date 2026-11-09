/**
 * The review of the proofs of learning units (FR-114), the page «certificate review». Under `/api/career/certificates`.
 *
 *   GET    /?search&kind&status&page&pageSize   CertificatesPageDto  career_certificates.review: the waiting proofs by default, with the employee and their unit
 *   GET    /:id/file                            the proof file       career_certificates.review
 *   POST   /:id/approve                         204                  career_certificates.approve: its hours now count
 *   POST   /:id/reject                          204                  career_certificates.reject: with a reason of at least five characters
 *   POST   /:id/refer                           204                  career_certificates.refer: to the employee's direct manager
 */
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CorePermission, type CertificatesPageDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { FilesService } from '../../../../core/files/application/files.service';
import { sendOpenedFile } from '../../../../core/files/presentation/send-file';
import { CareerReviewService } from '../../application/services/career-review.service';
import { CertificatesQueryDto, RejectProofDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career/certificates')
export class CareerCertificatesController {
  constructor(
    private readonly review: CareerReviewService,
    private readonly files: FilesService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.CareerCertificatesReview)
  list(@Query() query: CertificatesQueryDto): Promise<CertificatesPageDto> {
    return this.review.queue(query);
  }

  @Get(':id/file')
  @RequirePermission(CorePermission.CareerCertificatesReview)
  async file(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const file = await this.review.file(id);
    sendOpenedFile(res, file, await this.files.open(file));
  }

  @Post(':id/approve')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerCertificatesApprove)
  approve(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.review.approve(ctx, id);
  }

  @Post(':id/reject')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerCertificatesReject)
  reject(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string, @Body() body: RejectProofDto): Promise<void> {
    return this.review.reject(ctx, id, body);
  }

  @Post(':id/refer')
  @HttpCode(204)
  @RequirePermission(CorePermission.CareerCertificatesRefer)
  refer(@Access() ctx: AccessContext, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.review.refer(ctx, id);
  }
}
