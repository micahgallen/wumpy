#!/bin/bash
# Test inventory system

TIMESTAMP=$(date +%s)
USERNAME="invtest$TIMESTAMP"

echo "Testing Inventory System"
echo "Test user: $USERNAME"
echo "========================="
echo

(
  sleep 1
  echo "$USERNAME"
  sleep 0.5
  echo "yes"
  sleep 0.5
  echo "password123"
  sleep 1
  echo "look"
  sleep 0.5
  echo "examine cookie"
  sleep 0.5
  echo "inventory"
  sleep 0.5
  echo "get cookie"
  sleep 0.5
  echo "inventory"
  sleep 0.5
  echo "look"
  sleep 0.5
  echo "examine cookie"
  sleep 0.5
  echo "drop cookie"
  sleep 0.5
  echo "inventory"
  sleep 0.5
  echo "look"
  sleep 0.5
  echo "get cookie"
  sleep 0.5
  echo "north"
  sleep 0.5
  echo "inventory"
  sleep 0.5
  echo "score"
  sleep 0.5
  echo "quit"
) | nc localhost 4000

echo
echo "Test completed!"
