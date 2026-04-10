# Project Memory

## Overview

Sport Tracker is a planned single-user web app for tracking strength workouts on a local network. The repository currently contains a detailed implementation plan (`plan.md`) and a design reference (`variant-2-soft.jsx`); the actual app has not been implemented yet.

## Tech Stack

- Frontend: React + Vite
- State/data: Zustand + TanStack Query
- Backend: Express
- Database: SQLite (`better-sqlite3`)
- Validation: Zod
- PWA: `vite-plugin-pwa` / Workbox
- Media uploads: Multer + Sharp
- Deployment: Docker Compose

## Conventions

- Russian-only UI is assumed in the current plan.
- `variant-2-soft.jsx` is the design source of truth for tokens and core visual patterns.
- The plan favors immediate server persistence for workout changes instead of batch save flows.

## Key Decisions

- Single-user, local-network scope; no full auth is planned.
- Active workout state is split between server persistence and lightweight client state.
- Plan is structured for parallel execution, but shared infra must be hoisted to avoid merge conflicts.

## Current State

- Planning/review stage only; implementation has not started.
- Main plan strengths: solid stack choices, good auto-save strategy, thoughtful pre-mortem, concrete design reference.
- Main plan changes required before implementation:
  - define timezone/local-date strategy
  - prevent history loss from exercise deletion (`RESTRICT` + archive instead of cascade)
  - replace `INSERT OR REPLACE` PR logic with proper conflict update semantics
  - move shared validation/route-registration infrastructure earlier in the DAG
  - fix missing task dependencies around templates/history/dashboard/muscle-map

## Known Issues

- Current plan can lose workout history because of cascade deletes.
- Current plan underspecifies offline/error UX for the active workout flow.
- Current plan has DAG conflicts for parallel API tasks touching shared files.
- Export exists in plan, but import/restore is missing.
- PWA/API caching, photo privacy, and backup strategy need tighter definition.

## Session Log

- 2026-04-10: Reviewed `plan.md` with parallel architecture, UX, security, and delivery audits; synthesized high-priority amendments before implementation start.
