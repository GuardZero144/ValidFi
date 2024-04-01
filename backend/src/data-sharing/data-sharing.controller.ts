import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { DataSharingService } from './data-sharing.service';
import { CreateSharedDataDto } from './dto/create-shared-data.dto';
import { UpdateSharedDataDto } from './dto/update-shared-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('data-sharing')
@UseGuards(JwtAuthGuard)
export class DataSharingController {
  constructor(private readonly dataSharingService: DataSharingService) {}

  @Post()
  create(@Body() createSharedDataDto: CreateSharedDataDto, @Request() req) {
    return this.dataSharingService.create({
      ...createSharedDataDto,
      ownerAddress: req.user.walletAddress,
    });
  }

  @Get()
  findAll() {
    return this.dataSharingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dataSharingService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSharedDataDto: UpdateSharedDataDto) {
    return this.dataSharingService.update(id, updateSharedDataDto);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.dataSharingService.revoke(id);
  }

  @Get(':id/active')
  isShareActive(@Param('id') id: string) {
    return this.dataSharingService.isShareActive(id);
  }

  @Get('owner/:ownerAddress')
  findByOwner(@Param('ownerAddress') ownerAddress: string) {
    return this.dataSharingService.findByOwner(ownerAddress);
  }

  @Get('recipient/:recipientAddress')
  findByRecipient(@Param('recipientAddress') recipientAddress: string) {
    return this.dataSharingService.findByRecipient(recipientAddress);
  }

  @Patch(':id/extend')
  extendShare(@Param('id') id: string, @Body('additionalSeconds') additionalSeconds: number) {
    return this.dataSharingService.extendShare(id, additionalSeconds);
  }
}
