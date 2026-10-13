export interface MemoryContextPacket {
  text?: string;
  items?: readonly unknown[];
  metadata?: Readonly<Record<string, unknown>>;
}

export interface VaultReader {
  read<TValue = unknown>(key: string): Promise<TValue | null>;
}

export interface VaultWriter {
  write<TValue = unknown>(key: string, value: TValue): Promise<void>;
}

export interface VaultSearch {
  search(query: string, options?: Readonly<Record<string, unknown>>): Promise<readonly unknown[]>;
}

export interface MemoryContextProvider {
  getContext(input?: Readonly<Record<string, unknown>>): Promise<MemoryContextPacket>;
}
