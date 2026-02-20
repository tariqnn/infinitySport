import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Create upload directories if they don't exist
  const uploadDirs = ['./uploads/images', './uploads/videos', './uploads/media', './uploads/invoices'];
  uploadDirs.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  // Serve static files from uploads directory
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Enable CORS (LANDING_ORIGIN can be comma-separated for multiple domains, e.g. production + localhost)
  const landingOrigins = (process.env.LANDING_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const adminOrigin = process.env.ADMIN_ORIGIN || 'http://localhost:3001';
  const portalOrigin = process.env.PORTAL_ORIGIN || 'http://localhost:3002';
  const productionOrigins: string[] = [];
  const origins = [
    ...landingOrigins,
    adminOrigin,
    portalOrigin,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    ...productionOrigins,
  ];
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id', 'x-member-email'],
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Add root route handler
  app.getHttpAdapter().get('/', (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Infinity Sports API',
      version: '1.0.0',
      status: 'running',
      api: 'Visit /api for API endpoints',
      health: 'Visit /api/health for health check',
    });
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API server running on http://0.0.0.0:${port}`);
  console.log(`📁 Uploads directory: ${join(process.cwd(), 'uploads')}`);
  console.log(`🌐 API endpoints available at http://0.0.0.0:${port}/api`);
}

bootstrap();

