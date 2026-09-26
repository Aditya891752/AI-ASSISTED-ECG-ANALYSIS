# PS-03 — ECG Screening Frontend

A dark-themed, real-time ECG screening dashboard built with React 18, TypeScript,
Tailwind CSS, Radix UI primitives, Recharts, TanStack Query, Zustand, and the
native WebSocket API.

## Setup

```bash
npm install
npm run dev        # starts on http://localhost:5173
```

The Vite dev server proxies `/api` and `/health` to `http://localhost:8000`
(including WebSocket upgrades for `/api/v1/stream`), so **make sure your
backend is running on port 8000 before starting the dev server** — otherwise
every page will show "Cannot reach backend" errors, which is expected
behavior, not a bug.

```bash
npm run build       # type-checks + builds to dist/
npm run preview     # serves the production build locally
```

## Pages

| Route      | Purpose                                                        |
|------------|-----------------------------------------------------------------|
| `/`        | Dashboard — stats, label distribution, 24h screening volume     |
| `/screen`  | Single ECG analysis — upload / paste / generate demo signal     |
| `/stream`  | Live WebSocket monitoring with a scrolling waveform              |
| `/batch`   | Multi-file batch submission with async job polling               |
| `/history` | Paginated, filterable past results with a detail drawer          |

## Notable implementation decisions

- **UI primitives are hand-built on Radix UI** (Tabs, Select, Dialog, Slider,
  Toast) rather than pulled from the shadcn CLI, since the CLI fetches
  component source from a registry at build time — this keeps the project
  fully self-contained and installable offline.
- **WebSocket path**: the spec's own example proxy config routed `/ws` to the
  backend, but the actual streaming endpoint is documented as `/api/v1/stream`.
  I aligned the proxy and the client to both use `/api/v1/stream` — if your
  real backend serves the WebSocket at a different path, update
  `vite.config.ts`'s proxy block and `src/hooks/useWebSocket.ts` together.
- **History detail drawer** shows the beat timeline and beat table, not a
  waveform — `ScreeningResult` doesn't include the raw signal array, only
  per-beat classifications, so there's no real amplitude data to plot there.
  The full waveform is only available right after a live `/screen` submission
  (where the signal you just sent is still in memory).
- **Demo Mode** (top-right button) navigates to `/screen?demo=1`, which
  auto-generates a synthetic signal, fills the patient ID, and auto-submits —
  useful for a live demo where you don't want to depend on a real file.
- **Code-split build**: Recharts and React/Router are split into separate
  chunks (`vite.config.ts` → `build.rollupOptions.output.manualChunks`) to
  keep the main bundle smaller.

## Known simplifications (given hackathon scope)

- The Stream page's mapping from a WebSocket `buffer_sample_offset` back to a
  position in the locally-buffered signal is an approximation — if your
  backend's offset semantics differ, you'll need to adjust the math in
  `src/pages/Stream.tsx` where `beatsAsClassifications` is computed.
- Batch CSV export currently exports only the job's aggregate summary, not a
  per-signal breakdown (the `JobDetailResponse` spec doesn't include per-signal
  results, only `result_ids` — you'd need a per-result fetch loop to build a
  richer export).
- No automated tests are included — given the timeline, manual testing against
  your running backend is the intended workflow.

## Environment

No `.env` file is needed for local dev — the Vite proxy handles routing to
`localhost:8000`. If you deploy the built `dist/` output somewhere other than
alongside the backend, you'll need to either serve it behind the same reverse
proxy or hardcode the backend's real URL in `src/api/client.ts` and
`src/hooks/useWebSocket.ts`.
