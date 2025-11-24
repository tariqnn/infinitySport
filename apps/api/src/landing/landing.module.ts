import { Module } from '@nestjs/common';
import { LandingService } from './landing.service';
import { PublicController } from './public.controller';
import { AdminController } from './admin.controller';

@Module({
  controllers: [PublicController, AdminController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}

