import { Controller, Get, Post, Body, Patch, Param, UseGuards, UseInterceptors, Request } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CreateVerificationDto } from './dto/create-verification.dto';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/audit.decorator';
import { AuditOperation } from '../audit/audit-log.entity';

@Controller('verifications')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  create(@Body() createVerificationDto: CreateVerificationDto) {
    return this.verificationService.create(createVerificationDto);
  }

  @Get()
  findAll() {
    return this.verificationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.verificationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVerificationDto: UpdateVerificationDto) {
    return this.verificationService.update(id, updateVerificationDto);
  }

  @Patch(':id/approve')
  @Audit(AuditOperation.VERIFIED)
  approve(@Param('id') id: string) {
    return this.verificationService.approve(id);
  }

  @Patch(':id/reject')
  @Audit(AuditOperation.VERIFIED)
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.verificationService.reject(id, reason);
  }

  @Get('identity/:identityId')
  findByIdentityId(@Param('identityId') identityId: string) {
    return this.verificationService.findByIdentityId(identityId);
  }
}
