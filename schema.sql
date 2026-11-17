CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('vendor', 'Recipient', 'admin')),
  phone VARCHAR(30),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
