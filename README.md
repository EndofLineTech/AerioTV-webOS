# AerioTV-webOS

A planned LG webOS TV implementation of [AerioTV for tvOS](https://github.com/jonzey231/AerioTV)
and [AerioTV for Android TV](https://github.com/jonzey231/AerioTV-Android).
The intended product matches the tvOS TV interface, controls, and menus, adds
Android TV capabilities where appropriate, and targets webOS 22 and newer.

Implementation has not begun. See the [approved implementation plan](docs/implementation-plan.md)
and [12-epic backlog index](docs/backlog-index.md).
The pinned-source specification covers the [TV screen/settings inventory](docs/reference-inventory.md),
[visual reference coverage](docs/visual-baseline.md),
[remote control and navigation](docs/remote-control-contract.md),
[platform decisions](docs/platform-decisions.md) and
[reuse/attribution requirements](docs/reuse-attribution.md).

E02 platform research, including LG's documented single-media-element limit,
is in [the capability evidence ledger](docs/webos-feasibility.md). The separate
[macOS Simulator/retail-TV diagnostic probe](spikes/webos-feasibility/README.md)
uses synthetic fixtures; retail hardware results remain pending.

## Branches

Development happens on [`dev`](https://github.com/EndofLineTech/AerioTV-webOS/tree/dev).
`main` is reserved for release-ready changes. Base feature branches and pull
requests for development on `dev`.

## Backlog on a fresh clone

The installed Beads CLI stores its Dolt database locally, outside Git. To
recreate the **initial** 72 issues and the first discovered tooling issue under
the same IDs:

```sh
bd init --prefix aerio
python3 scripts/create_backlog.py
bd ready --json
```

Do not run the bootstrap as a substitute for syncing issue changes. Before
using multiple clones for ongoing issue work, configure a shared Beads/Dolt
remote so updates to status, acceptance criteria, and dependencies persist.

This project tracks work with Beads (`bd`); GitHub Issues are not the board.
