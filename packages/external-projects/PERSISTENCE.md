# External-project persistence ownership

External projects own their own persistence. **Project Operations** now owns its SQLite client and `project_operations_*` tables while continuing to use the existing physical `data/chernobog.db` compatibility file. **Itch / Game Radar** retains its independent SQLite implementation. No data migration is performed in OH-1L.
