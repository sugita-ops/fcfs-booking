#!/usr/bin/env node

/**
 * FCFS Booking System - Database Verification Script
 * Runs verification queries to ensure schema and seed data are correct
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fcfs_booking'
});

async function runVerification() {
  const client = await pool.connect();

  try {
    console.log('🔍 Starting database verification...\n');

    // Test 1: Basic table counts
    console.log('📊 Table Counts:');
    const tables = ['tenants', 'users', 'companies', 'memberships', 'qualifications', 'projects', 'job_posts', 'job_slots'];

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count} records`);
    }

    // Test 2: Tenant data validation
    console.log('\n🏢 Tenant Validation:');
    const tenantResult = await client.query(`
      SELECT id, name, integration_mode, is_active
      FROM tenants
      WHERE id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    `);

    if (tenantResult.rows.length > 0) {
      const tenant = tenantResult.rows[0];
      console.log(`   ✅ Tenant found: ${tenant.name} (${tenant.integration_mode} mode)`);
    } else {
      console.log('   ❌ Test tenant not found');
    }

    // Test 3: Company relationships
    console.log('\n🏗️  Company Relationships:');
    const companyResult = await client.query(`
      SELECT c.name, c.is_gc, c.trades, COUNT(m.id) as member_count
      FROM companies c
      LEFT JOIN memberships m ON c.id = m.company_id
      WHERE c.tenant_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
      GROUP BY c.id, c.name, c.is_gc, c.trades
      ORDER BY c.is_gc DESC
    `);

    companyResult.rows.forEach(company => {
      const type = company.is_gc ? 'General Contractor' : 'Subcontractor';
      console.log(`   ${company.name} (${type}): ${company.member_count} members, trades: ${company.trades}`);
    });

    // Test 4: Available job slots
    console.log('\n📋 Available Job Slots:');
    const slotsResult = await client.query(`
      SELECT
        jp.title,
        js.work_date,
        js.status,
        js.slot_no,
        jp.unit_price,
        jp.currency
      FROM job_slots js
      JOIN job_posts jp ON js.job_post_id = jp.id
      WHERE js.tenant_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
      ORDER BY js.work_date, js.slot_no
    `);

    slotsResult.rows.forEach(slot => {
      const price = new Intl.NumberFormat('ja-JP').format(slot.unit_price);
      console.log(`   ${slot.work_date} (Slot ${slot.slot_no}): ${slot.title} - ${price} ${slot.currency} [${slot.status}]`);
    });

    // Test 5: Test RLS (simulate different tenant)
    console.log('\n🔒 RLS Testing:');

    // Set test tenant context
    await client.query(`SELECT set_test_tenant('550e8400-e29b-41d4-a716-446655440001'::uuid)`);

    const rlsResult = await client.query(`
      SELECT COUNT(*) as visible_slots
      FROM job_slots
    `);

    console.log(`   With correct tenant_id: ${rlsResult.rows[0].visible_slots} slots visible`);

    // Test with wrong tenant
    await client.query(`SELECT set_test_tenant('550e8400-e29b-41d4-a716-446655440999'::uuid)`);

    const rlsWrongResult = await client.query(`
      SELECT COUNT(*) as visible_slots
      FROM job_slots
    `);

    console.log(`   With wrong tenant_id: ${rlsWrongResult.rows[0].visible_slots} slots visible`);

    // Clear test context
    await client.query(`SELECT clear_test_tenant()`);

    // Test 6: Foreign key relationships
    console.log('\n🔗 Foreign Key Validation:');
    const fkResult = await client.query(`
      SELECT
        'job_slots -> job_posts' as relationship,
        COUNT(*) as valid_links
      FROM job_slots js
      JOIN job_posts jp ON js.job_post_id = jp.id
      WHERE js.tenant_id = '550e8400-e29b-41d4-a716-446655440001'::uuid

      UNION ALL

      SELECT
        'job_posts -> projects' as relationship,
        COUNT(*) as valid_links
      FROM job_posts jp
      JOIN projects p ON jp.project_id = p.id
      WHERE jp.tenant_id = '550e8400-e29b-41d4-a716-446655440001'::uuid

      UNION ALL

      SELECT
        'memberships -> companies' as relationship,
        COUNT(*) as valid_links
      FROM memberships m
      JOIN companies c ON m.company_id = c.id
      WHERE m.tenant_id = '550e8400-e29b-41d4-a716-446655440001'::uuid
    `);

    fkResult.rows.forEach(fk => {
      console.log(`   ${fk.relationship}: ${fk.valid_links} valid links`);
    });

    // Test 7: Indexes exist
    console.log('\n📇 Index Verification:');
    const indexResult = await client.query(`
      SELECT
        indexname,
        tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log(`   Found ${indexResult.rows.length} custom indexes:`);
    indexResult.rows.forEach(idx => {
      console.log(`   - ${idx.indexname} on ${idx.tablename}`);
    });

    console.log('\n✅ Database verification completed successfully!');

    return {
      success: true,
      summary: {
        tables: tables.length,
        tenant_found: tenantResult.rows.length > 0,
        companies: companyResult.rows.length,
        available_slots: slotsResult.rows.length,
        rls_working: rlsResult.rows[0].visible_slots > 0 && rlsWrongResult.rows[0].visible_slots === 0,
        indexes: indexResult.rows.length
      }
    };

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute if called directly
if (require.main === module) {
  runVerification().then(result => {
    if (!result.success) {
      process.exit(1);
    }
  });
}

module.exports = { runVerification };