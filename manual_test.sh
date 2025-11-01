#!/bin/bash

# Manual Testing Guide for UX Improvements
# Run this script to connect to the MUD and manually test features

echo "========================================"
echo "UX Improvements Manual Test Guide"
echo "========================================"
echo ""
echo "This will connect you to the MUD server."
echo "Test the following features:"
echo ""
echo "1. ASCII BANNER - Should see colorful welcome art"
echo "2. TEXT WRAPPING - Room descriptions should wrap at ~80 chars"
echo "3. CLEAR PROMPTS - Should see '>' prompt after each command"
echo "4. SPACING - Blank lines before/after command output"
echo ""
echo "Suggested test commands:"
echo "  - Create account: testuser3 / test123"
echo "  - look          (check room wrapping)"
echo "  - examine wumpy (check NPC description wrapping)"
echo "  - help          (check help text formatting)"
echo "  - inventory     (check spacing)"
echo "  - north         (test movement flow)"
echo "  - quit          (exit cleanly)"
echo ""
echo "Press Enter to connect..."
read

telnet localhost 4000
