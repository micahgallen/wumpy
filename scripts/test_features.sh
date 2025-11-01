#!/bin/bash
# Test script for new MUD features

echo "Testing The Wumpy and Grift MUD Server"
echo "========================================"
echo

# Test with a sequence of commands
(
  sleep 1
  echo "testplayer"
  sleep 0.5
  echo "yes"
  sleep 0.5
  echo "testpass"
  sleep 1
  echo "look"
  sleep 0.5
  echo "help"
  sleep 0.5
  echo "examine big bird"
  sleep 0.5
  echo "inventory"
  sleep 0.5
  echo "who"
  sleep 0.5
  echo "score"
  sleep 0.5
  echo "say Hello, world!"
  sleep 0.5
  echo "emote waves cheerfully"
  sleep 0.5
  echo ": does a little dance"
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
