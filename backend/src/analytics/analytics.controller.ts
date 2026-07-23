import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Using AuthGuard if there's one, but maybe for now let's just expose it
  // @UseGuards(JwtAuthGuard) 
  @Get('dashboard')
  async getDashboard() {
    return this.analyticsService.getDashboardMetrics();
  }
}
