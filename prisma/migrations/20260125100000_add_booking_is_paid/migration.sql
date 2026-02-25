-- Add isPaid to Booking for admin payment tracking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false;
