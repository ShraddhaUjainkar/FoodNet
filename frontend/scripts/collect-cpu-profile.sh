#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/collect-cpu-profile.sh [duration-seconds]
# Example: ./scripts/collect-cpu-profile.sh 45

DURATION=${1:-30}
OUTDIR="profiling"
mkdir -p "$OUTDIR"

echo "Starting Next dev with V8 CPU profiler for ${DURATION}s..."

NODE_OPTIONS="--cpu-prof --cpu-prof-name=foodnet" npm run dev &
PID=$!

echo "Next dev pid: $PID"
echo "Sleeping for $DURATION seconds — reproduce the issue now..."
sleep "$DURATION"

echo "Stopping Next (pid $PID)..."
kill "$PID" || true
sleep 2

LOGFILE=$(ls -t isolate-*.log 2>/dev/null | head -n1 || true)
if [ -z "$LOGFILE" ]; then
  echo "No isolate log found in project root. Exiting."
  exit 1
fi

OUTFILE="$OUTDIR/$(date +%Y%m%d_%H%M%S)_cpu-profile.txt"
echo "Processing $LOGFILE -> $OUTFILE"
node --prof-process "$LOGFILE" > "$OUTFILE"

echo "Profile written to $OUTFILE"
echo "Done."
