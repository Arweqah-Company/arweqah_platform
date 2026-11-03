import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { impersonationStamp } from '../../audit/application/impersonation-stamp';
import type { AuthenticatedRequest } from '../../../common/presentation/request-context';

/** Runs the request inside the stamp that adds the administrator's id to every audit entry written while they work as someone else. */
@Injectable()
export class ImpersonationStampInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const by = context.switchToHttp().getRequest<AuthenticatedRequest>().session?.session.impersonatedByUserId;
    if (!by) return next.handle();
    return new Observable((subscriber) => impersonationStamp.run({ impersonatedBy: by }, () => next.handle().subscribe(subscriber)));
  }
}
