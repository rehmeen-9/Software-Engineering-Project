-- Run after schema-listings.sql and schema-photo.sql. Safe to run more than once.
CREATE TABLE IF NOT EXISTS listing_images (
  listing_id INTEGER PRIMARY KEY REFERENCES food_listings(id) ON DELETE CASCADE,
  content_type VARCHAR(30) NOT NULL,
  data BYTEA NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
)