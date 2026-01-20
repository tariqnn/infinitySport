import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LandingService } from './landing.service';
import {
  HeroSection,
  Program,
  Offer,
  Event,
  Announcement,
  FacilityHighlight,
  FooterLink,
  FooterSettings,
  Prisma,
} from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly landingService: LandingService) {}

  // Hero Section
  @Get('hero')
  async getHero() {
    return this.landingService.getHero();
  }

  @Patch('hero')
  async updateHero(@Body() data: Partial<HeroSection>) {
    return this.landingService.updateHero(data);
  }

  // Programs
  @Get('programs')
  async getPrograms() {
    return this.landingService.getPrograms();
  }

  @Get('programs/:id')
  async getProgram(@Param('id') id: string) {
    return this.landingService.getProgram(id);
  }

  @Post('programs')
  async createProgram(@Body() data: Prisma.ProgramCreateInput) {
    return this.landingService.createProgram(data);
  }

  @Patch('programs/:id')
  async updateProgram(@Param('id') id: string, @Body() data: Prisma.ProgramUpdateInput) {
    return this.landingService.updateProgram(id, data);
  }

  @Delete('programs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProgram(@Param('id') id: string) {
    await this.landingService.deleteProgram(id);
  }

  // Offers
  @Get('offers')
  async getOffers() {
    return this.landingService.getOffers();
  }

  @Get('offers/:id')
  async getOffer(@Param('id') id: string) {
    return this.landingService.getOffer(id);
  }

  @Post('offers')
  async createOffer(@Body() data: Prisma.OfferCreateInput) {
    return this.landingService.createOffer(data);
  }

  @Patch('offers/:id')
  async updateOffer(@Param('id') id: string, @Body() data: Prisma.OfferUpdateInput) {
    return this.landingService.updateOffer(id, data);
  }

  @Delete('offers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOffer(@Param('id') id: string) {
    await this.landingService.deleteOffer(id);
  }

  // Events
  @Get('events')
  async getEvents() {
    return this.landingService.getEvents();
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string) {
    return this.landingService.getEvent(id);
  }

  @Post('events')
  async createEvent(@Body() data: Prisma.EventCreateInput) {
    return this.landingService.createEvent(data);
  }

  @Patch('events/:id')
  async updateEvent(@Param('id') id: string, @Body() data: Prisma.EventUpdateInput) {
    return this.landingService.updateEvent(id, data);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string) {
    await this.landingService.deleteEvent(id);
  }

  // Announcements
  @Get('announcements')
  async getAnnouncements() {
    return this.landingService.getAnnouncements();
  }

  @Get('announcements/:id')
  async getAnnouncement(@Param('id') id: string) {
    return this.landingService.getAnnouncement(id);
  }

  @Post('announcements')
  async createAnnouncement(@Body() data: Prisma.AnnouncementCreateInput) {
    return this.landingService.createAnnouncement(data);
  }

  @Patch('announcements/:id')
  async updateAnnouncement(@Param('id') id: string, @Body() data: Prisma.AnnouncementUpdateInput) {
    return this.landingService.updateAnnouncement(id, data);
  }

  @Delete('announcements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAnnouncement(@Param('id') id: string) {
    await this.landingService.deleteAnnouncement(id);
  }

  // Facilities
  @Get('facilities')
  async getFacilities() {
    return this.landingService.getFacilities();
  }

  @Get('facilities/:id')
  async getFacility(@Param('id') id: string) {
    return this.landingService.getFacility(id);
  }

  @Post('facilities')
  async createFacility(@Body() data: Prisma.FacilityHighlightCreateInput) {
    return this.landingService.createFacility(data);
  }

  @Patch('facilities/:id')
  async updateFacility(@Param('id') id: string, @Body() data: Prisma.FacilityHighlightUpdateInput) {
    return this.landingService.updateFacility(id, data);
  }

  @Delete('facilities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFacility(@Param('id') id: string) {
    await this.landingService.deleteFacility(id);
  }

  // Footer Links
  @Get('footer-links')
  async getFooterLinks() {
    return this.landingService.getFooterLinks();
  }

  @Get('footer-links/:id')
  async getFooterLink(@Param('id') id: string) {
    return this.landingService.getFooterLink(id);
  }

  @Post('footer-links')
  async createFooterLink(@Body() data: Prisma.FooterLinkCreateInput) {
    return this.landingService.createFooterLink(data);
  }

  @Patch('footer-links/:id')
  async updateFooterLink(@Param('id') id: string, @Body() data: Prisma.FooterLinkUpdateInput) {
    return this.landingService.updateFooterLink(id, data);
  }

  @Delete('footer-links/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFooterLink(@Param('id') id: string) {
    await this.landingService.deleteFooterLink(id);
  }

  // Footer Settings
  @Get('footer-settings')
  async getFooterSettings() {
    return this.landingService.getFooterSettings();
  }

  @Patch('footer-settings')
  async updateFooterSettings(@Body() data: Partial<FooterSettings>) {
    return this.landingService.updateFooterSettings(data);
  }
}

