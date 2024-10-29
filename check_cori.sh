#!/bin/bash

# Paths for the two servers
FRONTSERVER_KEYWORD="frontserver"
FRONTSERVER_COMMAND="node /xd1/homes/hash/23/97/a19723/05/49/u184905/bin7/frontserver.js"

PROCESS_KEYWORD="cori"
START_COMMAND="node /xd1/homes/hash/23/97/a19723/05/49/u184905/bin6/clinicmgr/cori.js"

# Log file for output (using explicit path)
LOG_FILE="/xd1/homes/hash/23/97/a19723/05/49/u184905/bin6/clinicmgr/logfile.log"

# Function to log messages with timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_message "=== Starting script to check if $FRONTSERVER_KEYWORD and $PROCESS_KEYWORD are running ==="

# Check and start the frontserver.js if necessary
log_message "Checking for $FRONTSERVER_KEYWORD process..."
if ! ps aux | grep "$FRONTSERVER_KEYWORD" | grep -v "grep" | grep -v "$0" > /dev/null
then
    log_message "$FRONTSERVER_KEYWORD is not running."
    log_message "Starting $FRONTSERVER_KEYWORD with nohup..."
    nohup $FRONTSERVER_COMMAND > /dev/null 2>&1 &
    log_message "$FRONTSERVER_KEYWORD started with nohup."
else
    log_message "$FRONTSERVER_KEYWORD is already running."
fi

# Check if port 3000 is in use (which should be where cori.js listens)
log_message "Checking if port 3000 is being used by $PROCESS_KEYWORD..."
if ! lsof -i :3000 > /dev/null
then
    log_message "Port 3000 is not in use. Starting $PROCESS_KEYWORD with nohup..."
    nohup $START_COMMAND > /dev/null 2>&1 &
    log_message "$PROCESS_KEYWORD started with nohup."
else
    log_message "Port 3000 is already in use. $PROCESS_KEYWORD is likely running."
fi

log_message "=== Script execution finished ==="

