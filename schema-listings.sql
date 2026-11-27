-- Run after schema.sql. Safe to run more than once.

-- Fix: schema.sql allowed 'Recipient' but the API saves 'recipient', so signing up as a recipient would fail.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('vendor', 'recipient', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS about TEXT;

CREATE TABLE IF NOT EXISTS food_listings (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  food_type VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  pickup_start TIMESTAMPTZ,
  expiry_time TIMESTAMPTZ NOT NULL,       -- end of the pickup window
  pickup_address TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES food_listings(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER UNIQUE REFERENCES claims(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP;
