import '@testing-library/jest-dom'

// Load environment variables for testing
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Set test database URL if not provided
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://localhost:5432/fcfs_booking';
}

// Set test JWT secret
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key';
}