import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  HeroSection,
  Program,
  Offer,
  Event,
  Announcement,
  FacilityHighlight,
  FooterLink,
  FooterSettings,
  Package,
  Prisma,
} from '@prisma/client';

@Injectable()
export class LandingService {
  constructor(private prisma: PrismaService) {}

  // Hero Section
  async getHero(): Promise<HeroSection | null> {
    return this.prisma.heroSection.findFirst();
  }

  async updateHero(data: Partial<HeroSection>): Promise<HeroSection> {
    const existing = await this.prisma.heroSection.findFirst();
    if (existing) {
      return this.prisma.heroSection.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.heroSection.create({
      data: data as Prisma.HeroSectionCreateInput,
    });
  }

  // Programs
  async getPrograms(): Promise<Program[]> {
    return this.prisma.program.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async getProgram(id: string): Promise<Program | null> {
    return this.prisma.program.findUnique({ where: { id } });
  }

  async createProgram(data: Prisma.ProgramCreateInput): Promise<Program> {
    return this.prisma.program.create({ data });
  }

  async updateProgram(id: string, data: Prisma.ProgramUpdateInput): Promise<Program> {
    return this.prisma.program.update({
      where: { id },
      data,
    });
  }

  async deleteProgram(id: string): Promise<void> {
    await this.prisma.program.delete({ where: { id } });
  }

  // Offers
  async getOffers(): Promise<Offer[]> {
    return this.prisma.offer.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async getOffer(id: string): Promise<Offer | null> {
    return this.prisma.offer.findUnique({ where: { id } });
  }

  async createOffer(data: Prisma.OfferCreateInput): Promise<Offer> {
    return this.prisma.offer.create({ data });
  }

  async updateOffer(id: string, data: Prisma.OfferUpdateInput): Promise<Offer> {
    return this.prisma.offer.update({
      where: { id },
      data,
    });
  }

  async deleteOffer(id: string): Promise<void> {
    await this.prisma.offer.delete({ where: { id } });
  }

  // Events
  async getEvents(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { date: 'asc' },
    });
  }

  async getUpcomingEvents(): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async getEvent(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  async createEvent(data: Prisma.EventCreateInput): Promise<Event> {
    return this.prisma.event.create({ data });
  }

  async updateEvent(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data,
    });
  }

  async deleteEvent(id: string): Promise<void> {
    await this.prisma.event.delete({ where: { id } });
  }

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    return this.prisma.announcement.findMany({
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' },
      ],
    });
  }

  async getAnnouncement(id: string): Promise<Announcement | null> {
    return this.prisma.announcement.findUnique({ where: { id } });
  }

  async createAnnouncement(data: Prisma.AnnouncementCreateInput): Promise<Announcement> {
    return this.prisma.announcement.create({ data });
  }

  async updateAnnouncement(id: string, data: Prisma.AnnouncementUpdateInput): Promise<Announcement> {
    return this.prisma.announcement.update({
      where: { id },
      data,
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.prisma.announcement.delete({ where: { id } });
  }

  // Facility Highlights
  async getFacilities(): Promise<FacilityHighlight[]> {
    return this.prisma.facilityHighlight.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async getFacility(id: string): Promise<FacilityHighlight | null> {
    return this.prisma.facilityHighlight.findUnique({ where: { id } });
  }

  async createFacility(data: Prisma.FacilityHighlightCreateInput): Promise<FacilityHighlight> {
    return this.prisma.facilityHighlight.create({ data });
  }

  async updateFacility(id: string, data: Prisma.FacilityHighlightUpdateInput): Promise<FacilityHighlight> {
    return this.prisma.facilityHighlight.update({
      where: { id },
      data,
    });
  }

  async deleteFacility(id: string): Promise<void> {
    await this.prisma.facilityHighlight.delete({ where: { id } });
  }

  // Footer Links
  async getFooterLinks(): Promise<FooterLink[]> {
    return this.prisma.footerLink.findMany({
      orderBy: [
        { group: 'asc' },
        { order: 'asc' },
      ],
    });
  }

  async getFooterLink(id: string): Promise<FooterLink | null> {
    return this.prisma.footerLink.findUnique({ where: { id } });
  }

  async createFooterLink(data: Prisma.FooterLinkCreateInput): Promise<FooterLink> {
    return this.prisma.footerLink.create({ data });
  }

  async updateFooterLink(id: string, data: Prisma.FooterLinkUpdateInput): Promise<FooterLink> {
    return this.prisma.footerLink.update({
      where: { id },
      data,
    });
  }

  async deleteFooterLink(id: string): Promise<void> {
    await this.prisma.footerLink.delete({ where: { id } });
  }

  // Footer Settings (contact info + social links)
  async getFooterSettings(): Promise<FooterSettings | null> {
    return this.prisma.footerSettings.findFirst();
  }

  async updateFooterSettings(data: Partial<FooterSettings>): Promise<FooterSettings> {
    const existing = await this.prisma.footerSettings.findFirst();
    if (existing) {
      return this.prisma.footerSettings.update({
        where: { id: existing.id },
        data,
      });
    }
    return this.prisma.footerSettings.create({
      data: data as Prisma.FooterSettingsCreateInput,
    });
  }

  // Packages (single source of truth for sellable packages; Landing + Portal)
  async getPackages(): Promise<Package[]> {
    return this.prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /** All packages for admin (including inactive). */
  async getPackagesForAdmin(): Promise<Package[]> {
    return this.prisma.package.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getPackage(id: string): Promise<Package | null> {
    return this.prisma.package.findUnique({ where: { id } });
  }

  async getPackageByName(name: string): Promise<Package | null> {
    return this.prisma.package.findUnique({ where: { name } });
  }

  async createPackage(data: Prisma.PackageCreateInput): Promise<Package> {
    return this.prisma.package.create({ data });
  }

  async updatePackage(id: string, data: Prisma.PackageUpdateInput): Promise<Package> {
    return this.prisma.package.update({ where: { id }, data });
  }

  async deletePackage(id: string): Promise<void> {
    await this.prisma.package.delete({ where: { id } });
  }

  // Combined landing content
  async getLandingContent() {
    const [hero, programs, offers, events, announcements, facilities, footerLinks, footerSettings] = await Promise.all([
      this.getHero(),
      this.getPrograms(),
      this.getOffers(),
      this.getEvents(),
      this.getAnnouncements(),
      this.getFacilities(),
      this.getFooterLinks(),
      this.getFooterSettings(),
    ]);

    return {
      hero: hero || null,
      programs,
      offers,
      events,
      announcements,
      facilities,
      footerLinks,
      footerSettings: footerSettings || null,
    };
  }
}

