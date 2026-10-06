# Approved backlog index

Beads is the source of truth for status, dependencies and acceptance criteria.
Each epic has five children, numbered `.1` through `.5`, corresponding to the
approved plan aliases. For example, E01.1 is `aerio-bk6.1`.

| Plan alias | Beads epic | Scope |
| --- | --- | --- |
| E01 | aerio-bk6 | Reference specification |
| E02 | aerio-c1x | webOS feasibility |
| E03 | aerio-awn | Application foundation |
| E04 | aerio-20j | tvOS shell and input |
| E05 | aerio-5x6 | Onboarding and provider adapters |
| E06 | aerio-z9t | Live TV, guide, favorites and search |
| E07 | aerio-0o2 | Playback and player interface |
| E08 | aerio-4ql | Movies, series and viewing state |
| E09 | aerio-qgp | DVR and reminders |
| E10 | aerio-tbw | Multiview |
| E11 | aerio-8m4 | Settings, sync and integrations |
| E12 | aerio-6cv | Validation and releases |

## Board commands

```sh
bd ready --json
bd show aerio-bk6.1 --json
bd list --parent aerio-bk6 --json
bd dep tree aerio-6cv.5
bd dep cycles --json
```

Start with `aerio-bk6.1` (pin and inventory upstream behavior). Epics may appear in
`bd ready` as organizational containers; select actionable child work rather than
treating an epic's appearance as evidence that its implementation is unblocked.

All 72 issues were created open. There are 60 parent-child relationships and 164
task-level blocking dependencies. The initial Dolt database is local and excluded
from Git by Beads. After cloning, run `bd init --prefix aerio` and
`python3 scripts/create_backlog.py` to reconstruct these initial issues under the
same IDs. This is an initial-board bootstrap, not a way to sync later statuses;
configure a shared Dolt remote before using multiple working clones.
