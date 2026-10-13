# Personal Assistance persistence ownership

Personal Assistance owns PA attention, profile, mobile, responsibility, calendar, communication, and work-schedule state. PA now owns its **own SQLite connection** through `packages/personal-assistance/src/persistence.ts` while preserving the existing `data/chernobog.db` physical compatibility file, `CHERNOBOG_DATA_DIR` override semantics, existing tables, and stored state. OH-1L does not delete, reset, copy, or rename PA data.
