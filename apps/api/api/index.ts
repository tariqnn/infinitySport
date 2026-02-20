import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';

let app: NestExpressApplication;
let isInitialized = false;

async function createApp() {
  if (isInitialized && app) {
    return app;
  }

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  
  app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    logger: ['error', 'warn'],
  });

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

  // Enable CORS
  const landingOrigin = process.env.LANDING_ORIGIN || 'http://localhost:3000';
  const adminOrigin = process.env.ADMIN_ORIGIN || 'http://localhost:3001';
  const portalOrigin = process.env.PORTAL_ORIGIN || 'http://localhost:3002';
  const productionOrigins = [
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean) as string[];
  
  const origins = [
    landingOrigin,
    adminOrigin,
    portalOrigin,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    ...productionOrigins,
  ];
  
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-company-id'],
  });

  // Set global prefix
  app.setGlobalPrefix('api');

  // Add root route handler
  app.getHttpAdapter().get('/', (req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).json({
      message: 'Infinity Sports API',
      version: '1.0.0',
      status: 'running',
      api: 'Visit /api for API endpoints',
      health: 'Visit /api/health for health check',
    });
  });

  await app.init();
  isInitialized = true;
  
  return app;
}

export default async function handler(req: ExpressRequest, res: ExpressResponse) {
  const nestApp = await createApp();
  const expressApp = nestApp.getHttpAdapter().getInstance();
  expressApp(req, res);
}
