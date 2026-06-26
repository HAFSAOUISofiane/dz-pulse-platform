import type { Response } from "express";

interface SSEClient {
  res: Response;
}

const subscribers = new Map<string, Set<SSEClient>>();

export function addSSEClient(slug: string, res: Response): () => void {
  if (!subscribers.has(slug)) {
    subscribers.set(slug, new Set());
  }
  const client: SSEClient = { res };
  subscribers.get(slug)!.add(client);

  return () => {
    subscribers.get(slug)?.delete(client);
    if (subscribers.get(slug)?.size === 0) {
      subscribers.delete(slug);
    }
  };
}

export function broadcastPollUpdate(slug: string, data: object): void {
  const clients = subscribers.get(slug);
  if (!clients || clients.size === 0) return;

  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.res.write(payload);
    } catch {
      // ignore write errors; cleanup happens on close
    }
  }
}
