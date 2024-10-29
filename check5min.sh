#!/bin/bash

# Function to run the check_cori.sh script
run_check_cori() {
  echo "Running check_cori.sh..."
  # Run the check_cori.sh script
  ./check_cori.sh

  # Check if the script executed successfully
  if [ $? -eq 0 ]; then
    echo "check_cori.sh ran successfully."
  else
    echo "check_cori.sh encountered an error."
  fi
}

# Run the check_cori.sh script every 5 minutes
while true; do
  run_check_cori
  # Wait for 5 minutes (300 seconds)
  sleep 300
done


