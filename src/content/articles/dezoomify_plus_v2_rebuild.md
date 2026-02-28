---
title: "Dezoomify Plus v2: Rebuilding a Classic Tool for Modern Web UX"
date: "2026-02-28"
type: "Project"
description: "How I turned an aging dezoomify codebase into a Vercel-ready service with auth-gated advanced workflows, cleaner UX, and practical performance improvements."
tags: ["Web Engineering", "Vercel", "UX Design", "Open Source", "JavaScript"]
---

# Dezoomify Plus v2: Rebuilding a Classic Tool for Modern Web UX

I recently rebuilt my dezoomify deployment from a legacy single-page utility into a cleaner product called **Dezoomify Plus v2**.

The goal was simple:

1. Keep the public flow extremely easy for normal users.
2. Keep power features for advanced users.
3. Make it deploy cleanly on Vercel Hobby limits.

This post documents what changed and what worked.

## Why Rebuild?

The original project is powerful, but the interface and service architecture were hard for everyday users:

- Too many controls visible at once.
- Weak separation between one-click download and operational workflows.
- Inconsistent behavior under deployment constraints (cron limits, function limits, storage setup).

The result was that casual users felt overwhelmed, while power users still needed better queue/history tooling.

## Product Split: Public vs Advanced

The key product decision was to split the app into two clear experiences.

### 1. Public Simple Downloader

Anyone can:

- Paste a URL
- Start download
- Watch progress stages
- Save the final image

This became the default mode so first-time users are not forced into backend-oriented controls.

### 2. Authenticated Dashboard

After sign-in, users can access:

- Async queue
- Job history
- Schedules
- Metrics
- Retention/settings

Admin users also get an admin console snapshot view.

This separation removed most UX clutter from the default experience.

## UX Redesign Highlights

The v2 interface focused on minimalism and flow clarity:

- **Experience switch**: `Simple Download` vs `Dashboard`.
- **Step timeline**: Analyze -> Fetch -> Compose -> Ready.
- **Sticky save bar**: persistent save action once output is ready.
- **Concise error messaging** with optional technical details expansion.
- **Tabbed dashboard IA** instead of stacked multi-panel chaos.

The effect was immediate: users can complete a basic download without needing to understand queue systems or rate-limit internals.

## Service and Platform Work

### Vercel-first architecture

I consolidated API behavior around serverless routes and rewrites for:

- proxying
- async jobs
- history and schedule control
- auth/session handling
- metrics and admin views

### Storage behavior

Advanced features use persistent storage (`REDIS_URL` or KV REST vars).  
If auth is enforced and storage is missing, the service fails fast with explicit errors instead of silently degrading.

### Hobby limits handling

Two real constraints shaped implementation:

- Vercel Hobby cron restrictions (daily scheduling only).
- Function-count caps per deployment.

I adapted by:

- enforcing Hobby-safe schedule behavior in UI + backend,
- and consolidating handlers (including observability/auth/admin routing) to fit function limits.

## Performance Improvements

Beyond visuals, v2 also improved runtime behavior:

- bounded concurrency tile pipeline
- adaptive polling cadence for active vs idle states
- windowed async list rendering with load-more
- debounced filtering/search in queue/history views
- cancellation and retention cleanup paths to prevent stale list growth

These changes keep the app responsive as job volume grows.

## What I Learned

Three lessons stood out:

1. **Default UX must optimize for first success**, not for maximum feature visibility.
2. **Deployment constraints should shape design early** (especially on Vercel Hobby).
3. **Operational controls are valuable only when scoped by identity** (auth + owner-bound APIs).

## Where It Goes Next

Planned improvements include:

- stronger auth abuse/rate-limit test coverage,
- deeper cross-browser interaction tests,
- and tighter performance budgets in CI for large dashboards.

## Closing

Dezoomify Plus v2 is still the same core idea, but now it behaves like a modern service:

- simple for public users,
- capable for advanced users,
- and practical to run on budget infrastructure.

If you are modernizing an old but useful open-source tool, this pattern (simple-first UX + authenticated advanced workspace) is worth considering.
