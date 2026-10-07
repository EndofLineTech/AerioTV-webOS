# Approved backlog index

Beads is the source of truth for status, dependencies and acceptance criteria.
Each epic has five originally approved children, numbered `.1` through `.5`.
E12 also has discovered follow-up E12.6 (`aerio-6cv.6`). For example, E01.1
is `aerio-bk6.1`.

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

E01 and its five children were completed in the original local board. The next
stage is webOS feasibility under `aerio-c1x`; check `bd ready --json` for work.
Epics may appear in `bd ready` as organizational containers; select actionable
child work rather than treating an epic as implementation-ready.

The product owner deferred `aerio-c1x.3` (multiview feasibility) and
`aerio-tbw` with all five children, **without a target date**. Their `bd`
status is `deferred`, not closed. Active E02, guide, settings and release issues
no longer wait on multiview; reactivation requires a deliberate decision.

Every E02–E12 epic and child bead carries direct links to the relevant E01
specification in its notes and a primary `spec_id`. The notes also identify
the applicable inventory screens and the tvOS-first source corrections. Run
`python3 scripts/create_backlog.py --references-only` to restore missing links
on an existing board; it preserves status, other notes, and chosen spec IDs.

The original 72 issues were created open; E12.6 is the first discovered item.
The current graph has 61 parent-child relationships and 162 task-level blocking
dependencies after adding E12.6 and removing three multiview prerequisites.
The Dolt database is local and excluded from Git by Beads. After cloning, run
`bd init --prefix aerio` and `python3 scripts/create_backlog.py` to reconstruct
these issues under the same IDs with the multiview items deferred. This is an
initial-board bootstrap, not a way to sync later statuses. Configure a shared
Dolt remote before using multiple working clones.
