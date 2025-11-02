#!/bin/bash

# Find the PID of the server process on port 4000
PID=$(lsof -t -i:4000)

if [ -z "$PID" ]; then
  echo "Server is not running."
else
  echo "Shutting down server with PID: $PID"
  kill $PID
  echo "Server shut down."
fi
