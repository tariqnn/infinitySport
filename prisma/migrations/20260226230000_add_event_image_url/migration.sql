-- Add optional image URL for events so admin can manage event pictures.
ALTER TABLE "Event" ADD COLUMN "imageUrl" TEXT;
