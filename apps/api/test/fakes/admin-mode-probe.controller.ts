import { Controller, Get } from '@nestjs/common';
import { RequireAdminMode } from '../../src/core/access/presentation/require-permission.decorator';

/** Stand-in for an admin page of a business module: it only answers while platform admin mode is on. */
@Controller('test-admin-probe')
export class AdminModeProbeController {
  @Get()
  @RequireAdminMode()
  probe(): { ok: true } {
    return { ok: true };
  }
}
