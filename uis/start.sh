#!/bin/sh
# Starts both Next.js apps inside the UI container:
#   website on port 3000, backoffice on port 3001.

# Stop the script immediately if any command fails.
set -e

# Start the website. The & at the end means "run it in the background
# and move on to the next line without waiting."
cd /app/website
npx next dev -p 3000 -H 0.0.0.0 &

# Start the backoffice the same way, on its own port.
cd /app/backoffice
npx next dev -p 3001 -H 0.0.0.0 &

# Keep the container alive for as long as the apps are running.
wait