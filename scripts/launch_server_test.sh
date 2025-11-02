#!/bin/bash

# Test script to launch the MUD server

echo "--- Starting Server Launch Test ---"

# 1. Shut down any existing server
echo "Attempting to shut down any existing server..."
./scripts/shutdown_server.sh

# 2. Clean up old log files
echo "Cleaning up old log files..."
rm -f server.log server.err

# 3. Launch the new server in the background
echo "Launching new server in the background..."
node src/server.js > server.log 2> server.err &
SERVER_PID=$!

# Give the server a moment to start
sleep 2

# 4. Check the log for the startup message
if grep "The Wumpy and Grift MUD Server" server.log; then
  echo "✅ SUCCESS: Server started successfully."
else
  echo "❌ FAILURE: Server did not start successfully."
  echo "--- server.log ---"
  cat server.log
  echo "--- server.err ---"
  cat server.err
fi

# 5. Shut down the server
echo "Shutting down the test server..."
kill $SERVER_PID

# Wait for the process to be killed
wait $SERVER_PID 2>/dev/null

echo "--- Server Launch Test Finished ---"