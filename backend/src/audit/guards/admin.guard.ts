import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Restricts a route to administrator wallets. The allowlist is supplied via the
 * `ADMIN_WALLETS` environment variable (comma-separated wallet addresses).
 *
 * Must be applied after {@link JwtAuthGuard}, which populates `request.user`.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly admins: Set<string>;

  constructor(private readonly configService: ConfigService) {
    const raw = this.configService.get<string>('ADMIN_WALLETS') ?? '';
    this.admins = new Set(
      raw
        .split(',')
        .map((address) => address.trim())
        .filter((address) => address.length > 0),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const walletAddress: string | undefined = request.user?.walletAddress;

    if (!walletAddress || !this.admins.has(walletAddress)) {
      throw new ForbiddenException('Administrator access required');
    }
    return true;
  }
}
