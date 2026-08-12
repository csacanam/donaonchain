import { Redis } from "@upstash/redis";
import { createRedis, redisConfigured } from "./config";

let client: Redis | null = null;

/**
 * Fixed-window rate limit.
 *
 * Fails OPEN when Redis is unavailable: this guards a donation button, and
 * refusing every donation because the counter is down would be a worse outcome
 * than briefly letting an abuser through.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!redisConfigured()) return true;
  if (!client) client = createRedis();

  try {
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const k = `rl:${key}:${bucket}`;
    const count = await client.incr(k);
    if (count === 1) await client.expire(k, windowSeconds);
    return count <= limit;
  } catch (err) {
    console.error("[ratelimit] unavailable, allowing request", err);
    return true;
  }
}
