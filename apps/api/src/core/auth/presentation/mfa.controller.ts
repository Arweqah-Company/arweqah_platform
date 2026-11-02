import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { authCodeSchema, verifyCodeSchema, type BackupCodesDto, type EnrollmentStartDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { AuthenticatedRequest, SessionUser } from '../../../common/presentation/request-context';
import { AllowBeforeMfa } from '../../access/presentation/require-permission.decorator';
import { AppConfig } from '../../../config/app-config.service';
import { AuthenticatorService } from '../application/authenticator.service';
import { TrustedDevicesService } from '../application/trusted-devices.service';
import { deviceSecretOf, setDeviceCookie } from './device-cookie';
import { InvitationService } from '../application/invitation.service';
import { AuthenticatorLockedError, InvalidCodeError } from '../domain/errors';

class CodeBody extends createZodDto(authCodeSchema) {}
class VerifyBody extends createZodDto(verifyCodeSchema) {}
class EmailBody extends createZodDto(z.strictObject({ email: z.email().max(254) })) {}
class TokenParam extends createZodDto(z.strictObject({ token: z.string().min(20).max(100) })) {}

/**
 * Authenticator-app enrollment and the per-session code check.
 * - Invitation links (public): a new employee scans the QR code from the e-mailed link.
 * - Signed-in (before the code is verified): someone who came in with Microsoft enrolls, or enters their code.
 */
@ApiTags('mfa')
@Controller('mfa')
export class MfaController {
  constructor(
    private readonly authenticator: AuthenticatorService,
    private readonly invitations: InvitationService,
    private readonly trusted: TrustedDevicesService,
    private readonly config: AppConfig,
  ) {}

  /** Sign-in step 1: tells the page whether this is a first sign-in (and e-mails the QR link when it is). */
  @Post('identify')
  @HttpCode(200)
  @AllowAnonymous()
  identify(@Body() { email }: EmailBody): Promise<{ firstTime: boolean }> {
    return this.invitations.identify(email);
  }

  @Get('enrollment/:token')
  @AllowAnonymous()
  async inviteEnrollment(@Param() { token }: TokenParam): Promise<EnrollmentStartDto> {
    const { userId } = await this.invitations.resolve(token);
    return this.authenticator.beginEnrollment(userId);
  }

  @Post('enrollment/:token/confirm')
  @HttpCode(200)
  @AllowAnonymous()
  async confirmInvite(@Param() { token }: TokenParam, @Body() { code }: CodeBody): Promise<BackupCodesDto> {
    const { userId, inviteId } = await this.invitations.resolve(token);
    const backupCodes = await this.authenticator.confirmEnrollment(userId, code);
    await this.invitations.consume(inviteId);
    return { backupCodes };
  }

  @Post('enroll')
  @HttpCode(200)
  @AllowBeforeMfa()
  enroll(@CurrentUser() user: SessionUser): Promise<EnrollmentStartDto> {
    return this.authenticator.beginEnrollment(user.id);
  }

  /** Enrolling proves the person holds the app, so this session counts as verified. */
  @Post('enroll/confirm')
  @HttpCode(200)
  @AllowBeforeMfa()
  async confirmEnroll(@CurrentUser() user: SessionUser, @Req() req: AuthenticatedRequest, @Body() { code }: CodeBody): Promise<BackupCodesDto> {
    const backupCodes = await this.authenticator.confirmEnrollment(user.id, code);
    await this.authenticator.markSessionVerified(sessionIdOf(req), user.id);
    return { backupCodes };
  }

  /** The code step after Microsoft sign-in (and for any session that is not verified yet). */
  @Post('verify')
  @HttpCode(204)
  @AllowBeforeMfa()
  async verify(@CurrentUser() user: SessionUser, @Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response, @Body() { code, rememberDevice }: VerifyBody): Promise<void> {
    const result = await this.authenticator.verify(user.id, code);
    if (result === 'locked') throw new AuthenticatorLockedError();
    if (result !== 'ok') throw new InvalidCodeError();
    await this.authenticator.markSessionVerified(sessionIdOf(req), user.id);
    // Trusting this browser is allowed only when the administrator set a number of days above 0.
    const device = rememberDevice ? await this.trusted.trust(user.id, req.headers['user-agent'] ?? null) : null;
    if (device) setDeviceCookie(res, device.secret, device.days, this.config.isProduction);
  }

  /** The code step after a Microsoft sign-in is skipped on a browser the person trusted (and the administrator still allows). */
  @Post('trusted-skip')
  @HttpCode(200)
  @AllowBeforeMfa()
  async trustedSkip(@CurrentUser() user: SessionUser, @Req() req: AuthenticatedRequest): Promise<{ skipped: boolean }> {
    if (!(await this.trusted.accepts(user.id, deviceSecretOf(req)))) return { skipped: false };
    await this.authenticator.markSessionVerified(sessionIdOf(req), user.id);
    return { skipped: true };
  }
}

function sessionIdOf(req: AuthenticatedRequest): string {
  const id = req.session?.session.id;
  if (!id) throw new InvalidCodeError();
  return id;
}
