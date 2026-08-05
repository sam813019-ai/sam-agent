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

const HANDOFF_KEY = (userId: string) => `handoff:${userId}`;
const HANDOFF_TTL = 14400; // 4 小時後自動恢復 AI

export async function setHandoff(userId: string): Promise<void> {
  await redis.set(HANDOFF_KEY(userId), '1', { ex: HANDOFF_TTL });
}

export async function releaseHandoff(userId: string): Promise<void> {
  await redis.del(HANDOFF_KEY(userId));
}

export async function isHandoff(userId: string): Promise<boolean> {
  return (await redis.get(HANDOFF_KEY(userId))) !== null;
}

/**
 * 節流鎖：取得成功回傳 true，冷卻期間回傳 false。
 * 用來避免 AI 故障時，每則客訊都推播一次管理員（先前一次故障累積 101 則）。
 */
export async function acquireAlertLock(name: string, ttlSeconds: number): Promise<boolean> {
  const res = await redis.set(`alert:${name}`, '1', { ex: ttlSeconds, nx: true });
  return res === 'OK';
}
