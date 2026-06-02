# `.kitchen/`

Internal, non-user-facing project documentation. The user-facing documentation
lives in `/docs/`. Everything in here is for the team — planning, decisions,
architecture, roadmaps, and discussion records.

This directory **is** tracked in git. It is reviewed in PRs alongside the
code it documents, and it lives in the same repo so the team can keep
documentation and code in lockstep.

## Layout

```
.kitchen/
├── README.md                    # this file
├── discussion/                  # records of discussions with the project owner
│   └── YYYY-MM-DD-<slug>.md
├── decisions/                   # architectural & project decision records (ADRs)
│   └── NNNN-<slug>.md
├── architecture/                # system & module architecture documents
├── roadmaps/                    # roadmaps in increasing granularity
│   ├── project-roadmap.md       # whole-project roadmap
│   └── vX.Y.Z/                  # per-version roadmaps, plans, tasks
│       ├── roadmap.md
│       ├── timeline.md
│       ├── phases/              # one plan per phase
│       └── tasks/               # task-level tracking
└── planning/                    # detailed planning notes per phase or topic
```

## Conventions

- **Discussion records** capture what was said and decided with the project
  owner. They are append-only — once written, amend by adding a follow-up,
  never by rewriting history.
- **Decisions** follow the ADR pattern: status, context, decision,
  consequences. Numbered sequentially. Once accepted, status does not revert
  to "proposed" — superseded decisions get a new ADR that links back.
- **Roadmaps** are kept current. When a phase moves forward, the roadmap
  moves with it. The roadmap is the source of truth for "where are we."
- **Project-root-relative paths only.** No local machine paths, no local
  file references, no environment-specific data anywhere in this directory.
- **Sensitive data is forbidden here.** API keys, tokens, credentials,
  personal data — none of that belongs in the repo, including in `.kitchen/`.
