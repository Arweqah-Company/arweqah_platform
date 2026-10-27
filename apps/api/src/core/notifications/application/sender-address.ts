export interface SenderAddress {
  name: string | null;
  email: string;
}

/** "Arweqah Platform <no-reply@arweqah.sa>" or a bare address. */
export function parseSender(from: string): SenderAddress {
  const match = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(from);
  if (!match) return { name: null, email: from.trim() };
  const name = match[1]!.replace(/^"|"$/g, '').trim();
  return { name: name || null, email: match[2]!.trim() };
}
