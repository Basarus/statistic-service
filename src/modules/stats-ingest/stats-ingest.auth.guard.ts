import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StatsIngestAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const providedApiKey = request.headers['x-api-key'];
    const expectedApiKey = this.configService.getOrThrow<string>('internalApiKey');

    if (!providedApiKey || providedApiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
