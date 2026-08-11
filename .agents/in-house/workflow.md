# Workflow Profile — Ham2K Portable Logger (PoLo)

Everything project-specific that the `ham2k-workflow` skills (`/next`,
`/iterate`, `/finalize`, `/merge`, `/done`) need. The skills hold the shape
of the process; this file holds what only this repo knows. Keep the section
headings — the skills reference them by name.

## Repo

- **origin**: `ham2k/app-polo` (`git@github.com:ham2k/app-polo.git`) — single
  remote for source. A second remote, `app-polo-dist`
  (`git@github.com:ham2k/app-polo-dist.git`), also exists locally; nothing in
  this profile pushes to it — see *Deploy and publishing* if that turns out
  to matter.
- **base branch**: `main` on `origin`, the only base. Branch off
  `origin/main`, never off local `main` or whatever is checked out.
- **CI**: GitHub Actions `node-tests.yml` — runs `npm ci && npm test -- --ci`
  (Jest only, no lint) on every `pull_request` and on `push` to `main`. Work
  stays local; a push to `origin` is a backup, not a review request.
  Known quirk (from a prior session): `main`'s "Node Tests" check can show
  red even when `npm test` passes locally — treat the local Jest run as the
  real gate, not the badge on `main`.
- **session tag**: `[PoLo]` — prefix session names with it.

## Tracking

- **CaBo project**: none. The developer chose chat-only tracking for this
  repo (2026-08-11) — `/next` presents plans directly in chat instead of
  commenting on a card, and `/merge` skips CaBo step 4 entirely.

## Branches and worktrees

- **branch names**: no CaBo prefix in use. Observed convention on this
  developer's own branches is `sd/<short-description>` (e.g. `sd/polo-bugs`,
  `sd/cqp-rules-check`); an agent working without a card should use
  `claude/<short-description>`.
- **worktrees**: optional — branching in place in the main checkout
  (`/Users/sd/Work/ham2k/app-polo`) is fine. If you do use a separate
  worktree, see *Bootstrap*: it starts with no installed dependencies and
  needs a manual step before Jest/ESLint will run in it.
- worktree directory: `.claude/worktrees/` under the main checkout is where
  this developer's own worktrees have been created; ad hoc worktrees
  elsewhere (e.g. under an `orca` workspace root) also occur and work the
  same way once bootstrapped.

## Bootstrap

A fresh worktree has no `node_modules` — `npm install` was never run in it
(only the main checkout `/Users/sd/Work/ham2k/app-polo` has been `npm
install`ed). Without this step, `npx`/`npm run` fail with "command not
found" and Jest/ESLint cannot run at all in the worktree.

```sh
# Fastest, verified working: reuse the main checkout's install (read-only,
# gitignored, safe — node_modules is untracked so this never touches git).
ln -s /Users/sd/Work/ham2k/app-polo/node_modules ./node_modules

# Slower alternative if the main checkout's dependency tree has drifted
# from this branch's package.json/package-lock.json:
npm install
```

Also run `mise trust` once per worktree (mise refuses to read `mise.toml`
from an unfamiliar directory otherwise) and `eval "$(mise activate zsh)"` in
each new shell to get `node`/`npx` on `PATH`.

Remove the symlink (`rm node_modules`) once done if you'd rather not leave it
sitting there — it's gitignored either way, so leaving it is also harmless.

## Gate

The one command that decides whether the work is good. CI runs only on
`main`, after the merge, so this local run IS the gate.

```sh
npm test -- --ci
```

- **What a narrower run skips**: `npx jest <path-to-spec>` for a single file
  is fine while iterating, but always run the full `npm test -- --ci` before
  merging — it's also exactly what CI runs, so it's the most direct check
  against a surprise on `main`.
- **Not part of the gate**: `npm run lint:check` (`eslint . --max-warnings
  0`) currently fails on a handful of pre-existing errors unrelated to any
  one branch (verified 2026-08-11: `no-unsafe-optional-chaining`,
  `no-empty`, `no-unused-vars` in files untouched by recent work). CI does
  not run lint either. Run `npm run lint` on files you actually touched as a
  sanity check, but a repo-wide `lint:check` failure is not a merge blocker
  and predates your change unless you can show otherwise.

## Running the app

Not independently re-verified this session (would require booting Metro and
a simulator, out of scope for a merge-only task) — carried over from a prior
session's finding, treat as a lead rather than confirmed fact:

- Metro/the dev server only serves correctly from the main checkout
  (`/Users/sd/Work/ham2k/app-polo`), not from a session worktree. To see a
  change running live, land it in the main checkout rather than expecting
  `npm start`/`npm run ios`/`npm run android` to work standalone from an
  arbitrary worktree.

## Finding this worktree's processes

Match by working directory, never by name or port — parallel sessions run
their own builds and a loose `pkill -f` kills someone else's.

```sh
lsof -t +D "$(pwd)" 2>/dev/null | sort -u
# or, for Metro/node specifically:
ps -eo pid,command | grep -i "[r]eact-native start\|[m]etro" | awk -v dir="$(pwd)" '{print $1}'
```

Not independently verified this session (no dev server was running here) —
standard pattern, confirm the PID's cwd before killing anything.

## Deploy and publishing

- **what a push to `main` triggers**: nothing beyond CI (confirmed by the
  developer, 2026-08-11) — `node-tests.yml` runs Jest; no deploy, publish,
  or release step fires automatically from a push to `main` in this repo.
- **merge-time hazards**: none identified yet in this profile. The
  `app-polo-dist` remote exists locally but no automation here pushes to it
  — if a future session finds out otherwise, update this section.
- **maintainer-only acts**: none identified yet.

## Conventions

- This repo's own `AGENTS.md` (`.agents/AGENTS.md`) carries the numbered
  Rules 1–12 (think before coding, surgical changes, fail loud, etc.) that
  govern how any agent should work here — read it, it's not duplicated here.
- QSO party county names that match a state name intentionally keep the word
  "County" — don't "fix" this if you see it.
- Formatting: `npm run format` runs `prettier --write .` then
  `eslint . --fix` — useful locally, but see *Gate* for why `lint:check`
  itself isn't a merge blocker today.
