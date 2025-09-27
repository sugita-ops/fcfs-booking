#!/usr/bin/env node

/**
 * FCFS Booking System - Database Migration Script
 * Executes SQL migration files in order
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fcfs_booking'
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migrations...');

    // Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id serial PRIMARY KEY,
        filename text UNIQUE NOT NULL,
        executed_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Get migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      // Check if migration already executed
      const result = await client.query(
        'SELECT id FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`🔄 Executing ${file}...`);

      // Read and execute migration
      const sqlContent = fs.readFileSync(
        path.join(migrationsDir, file),
        'utf8'
      );

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`✅ Successfully executed ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };