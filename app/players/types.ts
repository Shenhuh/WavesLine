// app/players/types.ts

export type PlayerDef = {
  key: string;
  name: string;
  avatar: string;
  description: string;                    // WHO YOU ARE TALKING TO block
  relationships: Record<string, string>;  // characterKey → relationship context
                                          // if key not found → stranger fallback
};