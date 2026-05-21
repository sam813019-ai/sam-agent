import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const KEY = (userId: string) => `chat:${userId}`;
const MAX = 10;
const TTL = 86400;

export type Message = { role: 'user' | 'assistant'; content: string };

export async function getHistory(userId: string): Promise<Message[]> {
  return (await redis.get<Message[]>(KEY(userId))) ?? [];
}

export async function appendMessages(userId: string, messages: Message[]): Promise<void> {
  const history = await getHistory(userId);
  const updated = [...history, ...messages].slice(-MAX);
  await redis.set(KEY(userId), updated, { ex: TTL });
}

export async function clearHistory(userId: string): Promise<void> {
  await redis.del(KEY(userId));
}
