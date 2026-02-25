-- Add customer fields to Booking for public/landing page bookings
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
