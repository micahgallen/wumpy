#!/bin/bash

# mudtester.sh - A simple script to test a MUD server connection.

# Usage: ./mudtester.sh <hostname> <port>

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <hostname> <port>"
  exit 1
fi

HOSTNAME=$1
PORT=$2

# Use gtimeout to avoid hanging. The -t option for gtimeout is in seconds.
# The script will try to connect and then immediately quit.

if gtimeout 5s /usr/bin/nc -z "$HOSTNAME" "$PORT"; then
  echo "Connection to $HOSTNAME:$PORT successful."
  exit 0
else
  echo "Connection to $HOSTNAME:$PORT failed."
  exit 1
fi
