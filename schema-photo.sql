-- Run after schema-listings.sql. Safe to run more than once.
ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS photo_url TEXT;
