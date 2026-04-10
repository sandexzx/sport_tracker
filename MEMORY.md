# Project Memory

## Overview

Sport Tracker — single-user strength training tracker for local network deployment. Full-stack monorepo with React frontend and Express backend.

## Tech Stack

- Frontend: React 18 + Vite 6, React Router v6, TanStack Query v5, Zustand v4, Recharts
- Backend: Express 4, better-sqlite3 (WAL mode), Zod validation
- PWA: vite-plugin-pwa with Workbox (registerType: prompt)
- Media: Multer + Sharp (photo resize to 1200px)
- Deployment: Docker Compose (node:20-alpine, multi-stage build)
- Fonts: DM Serif Display (headings), DM Sans (body)

## Conventions

- Russian-only UI throughout
- ES modules everywhere (`"type": "module"`)
- Design tokens in `client/src/styles/tokens.css` (terra=#c4704b, olive=#7a8a6e, cream=#f0e9df)
- `variant-2-soft.jsx` is the design reference
- Immediate server persistence for workout changes (no batch save)
- API hooks in `client/src/api/hooks/` — one file per domain
- Zustand for cross-component workout state (`workoutStore.js`)

## Key Decisions

- Single-user, no auth — designed for local network
- SQLite WAL mode with foreign keys enforced
- Single active workout constraint (409 if second attempted)
- PR auto-computation on workout completion via UPSERT
- Route order matters: `/api/active-workout` before `/api/workouts/:id`
- Custom SVG muscle body map (react-muscle-highlighter unavailable)
- Web Audio API for rest timer beep with iOS unlock pattern

## Current State

- **All 23 tasks implemented** — full application complete
- Build: `cd client && npx vite build` (778KB bundle with Recharts, PWA SW generated)
- Server: `node server/index.js` on port 3001 (dev) / 3000 (production)
- Deploy: `docker compose up -d --build`
- Database: 12 tables, 6 indexes, version-based migrations
- Seed data: 14 exercises, 3 templates, 5 workouts

## Known Issues

- Bundle size warning (778KB) — Recharts is large; could add code splitting
- No import/restore feature (only JSON export exists)
- No auth — not suitable for public internet deployment
- Parallel agent edits may have minor style inconsistencies across features

## Session Log

- 2025-07-23: Reviewed plan.md with audits; synthesized amendments
- 2025-07-24: Implemented all 23 tasks across 7 batches. Cleaned up server/index.js imports. Full build passes. Docker config ready.
