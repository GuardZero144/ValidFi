import { PartialType } from '@nestjs/mapped-types';
import { CreateSharedDataDto } from './create-shared-data.dto';
import { IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class UpdateSharedDataDto extends PartialType(CreateSharedDataDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  accessExpiry?: number;
}
