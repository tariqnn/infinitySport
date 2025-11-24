import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Infinity Sports API',
      version: '1.0.0',
      endpoints: {
        public: {
          landing: 'GET /api/public/landing',
          upcomingEvents: 'GET /api/public/events/upcoming',
          offers: 'GET /api/public/offers',
        },
        admin: {
          hero: {
            get: 'GET /api/admin/hero',
            update: 'PATCH /api/admin/hero',
          },
          programs: {
            list: 'GET /api/admin/programs',
            get: 'GET /api/admin/programs/:id',
            create: 'POST /api/admin/programs',
            update: 'PATCH /api/admin/programs/:id',
            delete: 'DELETE /api/admin/programs/:id',
          },
          offers: {
            list: 'GET /api/admin/offers',
            get: 'GET /api/admin/offers/:id',
            create: 'POST /api/admin/offers',
            update: 'PATCH /api/admin/offers/:id',
            delete: 'DELETE /api/admin/offers/:id',
          },
          events: {
            list: 'GET /api/admin/events',
            get: 'GET /api/admin/events/:id',
            create: 'POST /api/admin/events',
            update: 'PATCH /api/admin/events/:id',
            delete: 'DELETE /api/admin/events/:id',
          },
          announcements: {
            list: 'GET /api/admin/announcements',
            get: 'GET /api/admin/announcements/:id',
            create: 'POST /api/admin/announcements',
            update: 'PATCH /api/admin/announcements/:id',
            delete: 'DELETE /api/admin/announcements/:id',
          },
          facilities: {
            list: 'GET /api/admin/facilities',
            get: 'GET /api/admin/facilities/:id',
            create: 'POST /api/admin/facilities',
            update: 'PATCH /api/admin/facilities/:id',
            delete: 'DELETE /api/admin/facilities/:id',
          },
          footerLinks: {
            list: 'GET /api/admin/footer-links',
            get: 'GET /api/admin/footer-links/:id',
            create: 'POST /api/admin/footer-links',
            update: 'PATCH /api/admin/footer-links/:id',
            delete: 'DELETE /api/admin/footer-links/:id',
          },
        },
      },
      docs: 'Visit /api/public/landing to see all landing content',
    };
  }
}

