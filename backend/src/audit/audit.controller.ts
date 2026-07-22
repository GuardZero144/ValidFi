import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { ExportAuditLogDto } from './dto/export-audit-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

/**
 * Admin-only interface over the credential audit trail: filtered query,
 * integrity verification, retention control and compliance export.
 */
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  query(@Query() query: QueryAuditLogDto) {
    return this.auditService.query(query);
  }

  @Get('verify')
  verify() {
    return this.auditService.verifyIntegrity();
  }

  @Post('retention/sweep')
  sweep() {
    return this.auditService
      .enforceRetention()
      .then((purged) => ({ purged }));
  }

  @Get('export')
  async export(
    @Query() query: ExportAuditLogDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const format = query.format ?? 'json';
    const body = await this.auditService.export(query, format);
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-export.${format}"`,
    );
    return body;
  }
}
