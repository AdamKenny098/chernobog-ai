# Core persistence ownership

Core owns **Core runtime/session/state** persistence only. Existing `data/chernobog.db` remains a physical compatibility file during OH-1, but external domains must not borrow Core database implementation objects.
## OH-3B Job Scheduler Persistence

Core owns persistence for OH-3 job definitions, schedules, and job-run state because
these are Chernobog runtime/session/state records.

The authoritative runtime/composition package does not own filesystem or database
implementation. `@chernobog/runtime` may consume this Core-owned persistence
through the public `@chernobog/core` boundary in later OH-3 stages.

OH-3B persists state only. It does not own scheduler timers, worker execution,
leases, retry policy enforcement, or Event Spine publication.
