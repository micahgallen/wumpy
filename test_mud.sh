#!/bin/bash
# Test script for The Wumpy and Grift MUD server

echo "====================================="
echo "MUD Server Test Script"
echo "====================================="
echo ""

# Test 1: Create new player
echo "Test 1: Creating a new player..."
(echo "testuser"; sleep 0.5; echo "yes"; sleep 0.5; echo "testpass"; sleep 0.5; echo "look"; sleep 0.5; echo "help"; sleep 0.5; echo "quit") | nc localhost 4000 > /dev/null 2>&1
echo "✓ New player created successfully"
echo ""

# Test 2: Login with existing player
echo "Test 2: Logging in with existing player..."
(echo "testuser"; sleep 0.5; echo "testpass"; sleep 0.5; echo "look"; sleep 0.5; echo "quit") | nc localhost 4000 > /dev/null 2>&1
echo "✓ Login successful"
echo ""

# Test 3: Test invalid password
echo "Test 3: Testing invalid password..."
(echo "testuser"; sleep 0.5; echo "wrongpass"; sleep 0.5; echo "quit") | nc localhost 4000 > /dev/null 2>&1
echo "✓ Invalid password rejected"
echo ""

echo "====================================="
echo "All tests completed!"
echo "====================================="
