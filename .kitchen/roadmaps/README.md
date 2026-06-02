# Roadmaps

Roadmaps in increasing granularity:

```
roadmaps/
├── project-roadmap.md            # whole-project roadmap (all versions)
└── vX.Y.Z/                       # one directory per version
    ├── roadmap.md                # version-wide roadmap
    ├── timeline.md               # version-wide timeline (phases → dates)
    ├── phases/                   # one plan per phase
    │   ├── 01-<phase>.md
    │   └── ...
    └── tasks/                    # task-level tracking for the version
        ├── 01-<phase>-tasks.md
        └── ...
```

The current version's directory is `v0.1.0/`. Future versions get
their own directory.

## How to read these

- **Project owner** reads `project-roadmap.md` to know "where are we
  overall."
- **Orchestrator + project owner** read `vX.Y.Z/roadmap.md` to know
  "what is the current version doing."
- **Specialist agents** read `vX.Y.Z/phases/NN-<phase>.md` to know
  "what is my phase supposed to deliver."
- **Specialist agents + orchestrator** read
  `vX.Y.Z/tasks/NN-<phase>-tasks.md` to know "what are the actual
  tasks and their status."

## How to keep these current

- When a phase moves forward (started, blocked, completed), the
  phase plan is updated **and** the parent roadmap is updated to
  reflect the new status.
- When a task is started, completed, or blocked, both the task
  file and the parent phase plan are updated.
- Stale roadmaps are a project smell. If a roadmap is more than a
  week out of date with the actual state of the work, that is a
  problem to fix, not to defer.
