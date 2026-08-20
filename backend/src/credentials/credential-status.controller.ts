import { Controller, Get, Post, Param, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CredentialStatusService } from './credential-status.service';
import { CredentialStatusEvent } from './dto/credential-status.dto';

@ApiTags('credentials')
@Controller('credentials')
export class CredentialStatusController {
  private readonly logger = new Logger(CredentialStatusController.name);

  constructor(private readonly statusService: CredentialStatusService) {}

  @Get('status/:id')
  @ApiOperation({ summary: 'Get current credential status' })
  @ApiResponse({ status: 200, description: 'Returns credential status' })
  async getCredentialStatus(@Param('id') id: string) {
    this.logger.log(`Getting status for credential ${id}`);
    return { credentialId: id, message: 'Use WebSocket subscription for real-time updates' };
  }

  @Post('status/:id/revoke')
  @ApiOperation({ summary: 'Revoke a credential and broadcast status change' })
  @ApiResponse({ status: 200, description: 'Credential revoked and status broadcast' })
  async revokeCredential(@Param('id') id: string, @Body() body: { reason?: string }) {
    this.logger.log(`Revoking credential ${id}`);
    const result = await this.statusService.notifyCredentialRevoked(id, body.reason);
    return result;
  }

  @Post('status/:id/verify')
  @ApiOperation({ summary: 'Mark credential as verified and broadcast' })
  @ApiResponse({ status: 200, description: 'Credential verified and status broadcast' })
  async verifyCredential(@Param('id') id: string) {
    this.logger.log(`Verifying credential ${id}`);
    const result = await this.statusService.updateCredentialStatus(
      id,
      'verified',
      CredentialStatusEvent.VERIFIED,
    );
    return result.statusUpdate;
  }

  @Get('connections')
  @ApiOperation({ summary: 'Get number of active WebSocket connections' })
  @ApiResponse({ status: 200, description: 'Returns active connection count' })
  getConnectionCount() {
    return { activeConnections: this.statusService.getConnectedClientCount() };
  }
}
