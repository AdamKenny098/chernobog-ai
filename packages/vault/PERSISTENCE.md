# Vault persistence ownership

The Vault boundary owns Vault and memory persistence. Core and external projects consume Vault through public Vault interfaces and do not reach into Vault storage implementations. No Vault data migration is performed by OH-1L.
