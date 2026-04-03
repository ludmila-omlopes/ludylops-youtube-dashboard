# Backlog Playbook

This repo uses a very small backlog system on GitHub so bugs, live-operation fixes, and improvements stay easy to triage.

## Flow

Use four states in practice:

- `Inbox`: raw ideas, reports, and incidents
- `Ready`: clear enough to pick up next
- `Doing`: currently in progress
- `Done`: shipped or intentionally closed

If a future GitHub Project is added, these should become the default columns.

## Labels

Work should use one type label:

- `bug`
- `improvement`
- `infra`
- `ux`

And one priority label:

- `priority:p0`: live-blocking, login-breaking, or business-critical
- `priority:p1`: important and should be fixed soon
- `priority:p2`: quality, reliability, or polish
- `priority:p3`: nice-to-have or exploratory

## Good Issue Shape

Every issue should stay small and concrete.

- Problem: what is broken or weak
- Impact: who feels it and how often
- Evidence: screenshots, logs, deploy links, or user reports
- Acceptance criteria: how we know it is done

## Prioritization Rules

Pull work in this order when possible:

1. Auth, deploy, and live-execution failures
2. Viewer economy integrity: balances, redemptions, ranking, bets
3. Admin/operator visibility
4. UX polish and nice-to-have improvements

## Suggested Triage Rhythm

- Do a short weekly pass over new issues
- Keep only 1-3 items actively in progress
- Close duplicates fast
- Re-label vague issues before moving them into `Ready`

## High-Risk Areas For This Platform

- Google authentication and account linking
- Production env vars and deploy setup
- Bridge heartbeat and redemption execution
- Bet lifecycle transitions and payouts
- Viewer balance correctness
