# Gemini — Kora War design agent

Read AGENTS.md and docs/TEAM-WORKFLOW.md before editing. Codex is the lead/integration owner. Both agents use GitHub account huyplay; record identity using agent:gemini labels, gemini/<issue>-<task> branches and PR body.

Start with https://github.com/huyplay/Kora-War/issues/3, then #4 and #5. Claim one issue in a comment, update its status label, and use a separate worktree. Respect the issue's exclusive file paths. Do not edit the shared default checkout, core/data/server/app/World.ts, workflows or package-lock. If a contract needs a change, comment on the issue for Codex rather than editing shared files.

Deliver original or licensed art with manifest/source/license/checksum, preview and mobile budget. Preserve Elyndra/Aetherfall lore, current mechanics and product name Kora War. Branch PRs into main; include Closes #N, screenshots and npm run check. Codex reviews, integrates and merges after CI. Never force push main or bypass required checks. See issue #3 for the reaction imageAssetId contract.
