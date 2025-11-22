#!/bin/bash

# CLMS Test Runner Script
# Usage: ./run-tests.sh [options]

echo "🧪 CLMS Test Suite"
echo "=================="

# Set test environment variables
export TEST_THREAD_ID=${TEST_THREAD_ID:-"19aa0ad990d5b065"}
export TEST_POLICY_NUMBER=${TEST_POLICY_NUMBER:-"2525MCAE018956"}

# Parse command line arguments
case "$1" in
  "integration")
    echo "Running integration tests only..."
    npx vitest run tests/integration
    ;;
  "e2e")
    echo "Running E2E tests only..."
    npx vitest run tests/e2e
    ;;
  "watch")
    echo "Running tests in watch mode..."
    npx vitest
    ;;
  "ui")
    echo "Running tests with UI..."
    npx vitest --ui
    ;;
  "coverage")
    echo "Running tests with coverage..."
    npx vitest run --coverage
    ;;
  *)
    echo "Running all tests..."
    npx vitest run
    ;;
esac
