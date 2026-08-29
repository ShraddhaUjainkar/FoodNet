CPU profiling instructions for Next.js dev (macOS)

Quick steps

1. Start the dev server with V8 CPU profiling enabled (uses NODE_OPTIONS):

```bash
NODE_OPTIONS="--cpu-prof --cpu-prof-name=foodnet" npm run dev
```

2. Reproduce the high-CPU behavior you want to measure (idle, or trigger an OCR/API request).

3. Stop the server (Ctrl+C). A V8 log file named like `isolate-0x*.log` will be left in the project root.

4. Convert the V8 log into a readable summary:

```bash
node --prof-process isolate-*.log > cpu-profile.txt
less cpu-profile.txt
```

Alternative: collect a live profile using Chrome DevTools

1. Start the dev server with the inspector enabled:

```bash
node --inspect ./node_modules/.bin/next dev
```

2. Open `chrome://inspect` in Chrome, click `Open dedicated DevTools for Node`, then use the `Profiler` tab to record CPU activity while reproducing the issue.

Automated capture (helper script)

Use the script `scripts/collect-cpu-profile.sh` to start `next dev` with CPU profiling enabled for a defined duration, then process the log automatically.

Notes

- Profiling `next dev` will generate CPU logs and may produce multiple isolate logs; `node --prof-process` aggregates them.
- Keep the profiling duration short (30–60s) and reproduce the workload during that window.
- Run profiling in a clean environment (close other heavy apps) to reduce noise.

If you'd like, I can run the helper script or adjust it to only profile a single API endpoint (e.g., `/api/analyze`).
