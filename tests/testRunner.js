/**
 * Simple Test Runner
 *
 * Minimal test framework for running unit tests without external dependencies
 */

class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  /**
   * Define a test
   * @param {string} name - Test name
   * @param {Function} testFn - Test function
   */
  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  /**
   * Run all tests
   */
  async run() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running test suite: ${this.suiteName}`);
    console.log('='.repeat(60));

    for (const test of this.tests) {
      try {
        await test.testFn();
        this.passed++;
        console.log(`✓ ${test.name}`);
      } catch (error) {
        this.failed++;
        this.errors.push({ test: test.name, error: error.message });
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error.message}`);
      }
    }

    const suiteSuccess = this.printSummary();
    return suiteSuccess;
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('\n' + '-'.repeat(60));
    console.log(`Tests: ${this.passed + this.failed}`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);

    if (this.failed > 0) {
      console.log('\nFailed tests:');
      this.errors.forEach(({ test, error }) => {
        console.log(`  - ${test}: ${error}`);
      });
    }

    console.log('='.repeat(60) + '\n');

    return this.failed === 0;
  }
}

/**
 * Assertion helpers
 */
const assert = {
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },

  notEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `Expected not to equal ${expected}`);
    }
  },

  true(value, message) {
    if (value !== true) {
      throw new Error(message || `Expected true, got ${value}`);
    }
  },

  false(value, message) {
    if (value !== false) {
      throw new Error(message || `Expected false, got ${value}`);
    }
  },

  throws(fn, message) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }
  },

  greaterThan(actual, expected, message) {
    if (actual <= expected) {
      throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
  },

  lessThan(actual, expected, message) {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  },

  inRange(value, min, max, message) {
    if (value < min || value > max) {
      throw new Error(message || `Expected ${value} to be between ${min} and ${max}`);
    }
  },

  arrayContains(array, value, message) {
    if (!array.includes(value)) {
      throw new Error(message || `Expected array to contain ${value}`);
    }
  },

  isNull(value, message) {
    if (value !== null) {
      throw new Error(message || `Expected null, got ${value}`);
    }
  },

  notNull(value, message) {
    if (value === null) {
      throw new Error(message || 'Expected value to not be null');
    }
  },

  fail(message) {
    throw new Error(message || 'Test failed');
  }
};

module.exports = { TestRunner, assert };
