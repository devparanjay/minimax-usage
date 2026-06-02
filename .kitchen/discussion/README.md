# Discussion Records

Append-only records of discussions between the project owner and the team
(orchestrator and specialists). Each record captures:

- **When** the discussion happened.
- **What** was discussed.
- **What was decided** at the time.
- **What is still open** for follow-up.

## Naming

`YYYY-MM-DD-<slug>.md` — date + short kebab-case slug describing the topic.

## Updating

Discussion records are append-only. If a decision made in an earlier
discussion later changes, write a **new** discussion record (or a new ADR
in `.kitchen/decisions/`) and link back to the original — do not edit the
old record.
