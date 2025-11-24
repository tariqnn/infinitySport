import { Controller, Get } from '@nestjs/common';
import { LandingService } from './landing.service';

@Controller('public')
export class PublicController {
  constructor(private readonly landingService: LandingService) {}

  @Get('landing')
  async getLanding() {
    return this.landingService.getLandingContent();
  }

  @Get('programs')
  async getPrograms() {
    return this.landingService.getPrograms();
  }

  @Get('offers')
  async getOffers() {
    return this.landingService.getOffers();
  }

  @Get('events')
  async getEvents() {
    return this.landingService.getEvents();
  }

  @Get('events/upcoming')
  async getUpcomingEvents() {
    return this.landingService.getUpcomingEvents();
  }

  @Get('announcements')
  async getAnnouncements() {
    return this.landingService.getAnnouncements();
  }

  @Get('facilities')
  async getFacilities() {
    return this.landingService.getFacilities();
  }
}

