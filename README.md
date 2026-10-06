# AerioTV-webOS

A planned LG webOS TV implementation of [AerioTV for tvOS](https://github.com/jonzey231/AerioTV)
and [AerioTV for Android TV](https://github.com/jonzey231/AerioTV-Android).
The intended product matches the tvOS TV interface, controls, and menus, adds
Android TV capabilities where appropriate, and targets webOS 22 and newer.

Implementation has not begun. See the [approved implementation plan](docs/implementation-plan.md)
and [12-epic backlog index](docs/backlog-index.md).

## Branches

Development happens on [`dev`](https://github.com/EndofLineTech/AerioTV-webOS/tree/dev).
`main` is reserved for release-ready changes. Base feature branches and pull
requests for development on `dev`.

## Backlog on a fresh clone

The installed Beads CLI stores its Dolt database locally, outside Git. To
recreate the **initial** 72 issues under the same IDs:

```sh
bd init --prefix aerio
python3 scripts/create_backlog.py
bd ready --json
```

Do not run the bootstrap as a substitute for syncing issue changes. Before
using multiple clones for ongoing issue work, configure a shared Beads/Dolt
remote so updates to status, acceptance criteria, and dependencies persist.

This project tracks work with Beads (`bd`); GitHub Issues are not the board.
