# Core persistence ownership

Core owns **Core runtime/session/state** persistence only. Existing `data/chernobog.db` remains a physical compatibility file during OH-1, but external domains must not borrow Core database implementation objects.
