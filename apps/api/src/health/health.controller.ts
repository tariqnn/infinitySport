import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async checkHealth() {
    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Get counts from each table
      const [heroCount, programCount, offerCount, eventCount, announcementCount, facilityCount, footerLinkCount] = await Promise.all([
        this.prisma.heroSection.count(),
        this.prisma.program.count(),
        this.prisma.offer.count(),
        this.prisma.event.count(),
        this.prisma.announcement.count(),
        this.prisma.facilityHighlight.count(),
        this.prisma.footerLink.count(),
      ]);

      return {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        data: {
          hero: heroCount,
          programs: programCount,
          offers: offerCount,
          events: eventCount,
          announcements: announcementCount,
          facilities: facilityCount,
          footerLinks: footerLinkCount,
        },
        message: 'Database is connected and working! ✅',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'Database connection failed! ❌',
      };
    }
  }
}

