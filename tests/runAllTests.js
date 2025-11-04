/**
 * Run All Tests
 *
 * Executes all test suites and reports overall results
 */

async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('RUNNING ALL COMBAT SYSTEM TESTS');
  console.log('='.repeat(70));

  const testSuites = [
    require('./diceTests'),
    require('./modifierTests'),
    require('./combatTests'),
    require('./integrationTest'),
    require('./commands/combat/attackTests')
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  let allSuccess = true;

  for (const suite of testSuites) {
    const success = await suite.run();
    totalPassed += suite.passed;
    totalFailed += suite.failed;

    if (!success) {
      allSuccess = false;
    }
  }

  // Print overall summary
  console.log('\n' + '='.repeat(70));
  console.log('OVERALL TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  if (totalFailed === 0) {
    console.log('\n✓ ALL TESTS PASSED');
  } else {
    console.log('\n✗ SOME TESTS FAILED');
  }

  console.log('='.repeat(70) + '\n');

  return allSuccess;
}

if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runAllTests;
