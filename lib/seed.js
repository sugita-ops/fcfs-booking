#!/usr/bin/env node

/**
 * FCFS Booking System - Database Seed Script
 * Executes SQL seed files for development data
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fcfs_booking'
});

async function runSeeds() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seeding...');

    // Create seeds tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_seeds (
        id serial PRIMARY KEY,
        filename text UNIQUE NOT NULL,
        executed_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Get seed files
    const seedsDir = path.join(__dirname, '../seeds');
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${seedFiles.length} seed files`);

    for (const file of seedFiles) {
      // Check if seed already executed
      const result = await client.query(
        'SELECT id FROM schema_seeds WHERE filename = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🌱 Executing ${file}...`);

      // Read and execute seed
      const sqlContent = fs.readFileSync(
        path.join(seedsDir, file),
        'utf8'
      );

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_seeds (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Successfully executed ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('🎉 All seeds completed successfully!');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if called directly
if (require.main === module) {
  runSeeds();
}

module.exports = { runSeeds };