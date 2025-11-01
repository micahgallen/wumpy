#!/bin/bash

# Find and kill the running server
PID=$(lsof -i :4000 | grep LISTEN | awk '{print $2}')
if [ -n "$PID" ]; then
  echo "Killing server with PID: $PID"
  kill $PID
  sleep 1 # Give it a moment to die
else
  echo "Server not found."
fi

cd "$(dirname "$0")/.."

# Start the server
echo "Starting server..."
node src/server.js &
