#!/usr/bin/env node

/**
 * Concurrent Claims Test Script
 * Tests the FCFS (First Come, First Served) implementation
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const DEV_JWT = 'dev-token';
const TEST_SLOT_ID = '550e8400-e29b-41d4-a716-446655440601';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440302';

async function makeClaim(requestId) {
  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/claims`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEV_JWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        slotId: TEST_SLOT_ID,
        companyId: TEST_COMPANY_ID,
        requestId: `concurrent_${requestId}_${Date.now()}`
      })
    });

    const data = await response.json();
    const duration = Date.now() - startTime;

    return {
      requestId,
      status: response.status,
      duration,
      success: response.status === 200,
      conflict: response.status === 409,
      data
    };
  } catch (error) {
    return {
      requestId,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testConcurrentClaims(concurrency = 10) {
  console.log(`🚀 Starting concurrent claims test with ${concurrency} requests`);
  console.log(`Target slot: ${TEST_SLOT_ID}`);
  console.log(`API endpoint: ${API_BASE}/api/claims`);
  console.log('---');

  const startTime = Date.now();

  // Create concurrent requests
  const promises = Array.from({ length: concurrency }, (_, i) =>
    makeClaim(i + 1)
  );

  // Execute all requests concurrently
  const results = await Promise.all(promises);

  const totalDuration = Date.now() - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const conflicts = results.filter(r => r.conflict);
  const errors = results.filter(r => r.error);

  console.log('📊 Results Summary:');
  console.log(`✅ Successful claims: ${successful.length}`);
  console.log(`🔒 Conflict responses (409): ${conflicts.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`⏱️  Total duration: ${totalDuration}ms`);
  console.log('---');

  // Detailed results
  console.log('📋 Detailed Results:');
  results.forEach(result => {
    const statusEmoji = result.success ? '✅' : result.conflict ? '🔒' : '❌';
    const statusText = result.success ? 'SUCCESS' : result.conflict ? 'CONFLICT' : 'ERROR';

    console.log(`${statusEmoji} Request ${result.requestId}: ${statusText} (${result.duration}ms)`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('---');

  // Validation
  const isValid = successful.length === 1 && conflicts.length === (concurrency - 1);

  if (isValid) {
    console.log('🎉 Test PASSED: Exactly 1 successful claim, others returned 409 conflicts');

    if (successful.length > 0) {
      console.log('📝 Successful claim details:');
      console.log('   Slot ID:', successful[0].data.slot.id);
      console.log('   Status:', successful[0].data.slot.status);
      console.log('   Claimed at:', successful[0].data.claim.claimed_at);
    }
  } else {
    console.log('❌ Test FAILED: Expected exactly 1 success and others as conflicts');
    console.log(`   Got: ${successful.length} success, ${conflicts.length} conflicts, ${errors.length} errors`);
  }

  return {
    passed: isValid,
    successful: successful.length,
    conflicts: conflicts.length,
    errors: errors.length,
    totalDuration
  };
}

async function resetSlot() {
  console.log('🔄 Resetting slot for fresh test...');

  // This would require database access to reset the slot
  // For now, just inform the user
  console.log('⚠️  Manual reset required: Run npm run db:seed to reset test data');
}

async function main() {
  const concurrency = parseInt(process.argv[2]) || 10;

  console.log('🎯 FCFS Concurrent Claims Test');
  console.log('===============================');

  try {
    await resetSlot();

    const result = await testConcurrentClaims(concurrency);

    console.log('\n🏁 Test Complete');
    console.log(`Result: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`);

    process.exit(result.passed ? 0 : 1);

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testConcurrentClaims };