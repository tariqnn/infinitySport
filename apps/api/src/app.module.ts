import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { LandingModule } from './landing/landing.module';
import { PortalModule } from './portal/portal.module';
import { HealthModule } from './health/health.module';
import { UploadModule } from './upload/upload.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    LandingModule,
    PortalModule,
    HealthModule,
    UploadModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

