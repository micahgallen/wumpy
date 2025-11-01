#!/bin/bash
# Test script for new MUD features - creates a new user

TIMESTAMP=$(date +%s)
USERNAME="testuser$TIMESTAMP"

echo "Testing The Wumpy and Grift MUD Server"
echo "Creating test user: $USERNAME"
echo "========================================"
echo

# Test with a sequence of commands
(
  sleep 1
  echo "$USERNAME"
  sleep 0.5
  echo "yes"
  sleep 0.5
  echo "testpass123"
  sleep 1
  echo "look"
  sleep 0.5
  echo "examine big bird"
  sleep 0.5
  echo "inventory"
  sleep 0.5
  echo "who"
  sleep 0.5
  echo "score"
  sleep 0.5
  echo "say Hello, Sesame Street!"
  sleep 0.5
  echo "emote waves to everyone"
  sleep 0.5
  echo "north"
  sleep 0.5
  echo "look"
  sleep 0.5
  echo "south"
  sleep 0.5
  echo "quit"
) | nc localhost 4000

echo
echo "Test completed!"
