async function command(args: (string | number)[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Redis storage is not configured");
  const response = await fetch(url, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args), cache: "no-store", signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Redis storage unavailable (${response.status})`);
  const body = await response.json();
  if (body.error || !("result" in body)) throw new Error("Invalid Redis response");
  return body.result;
}

export async function readDocument<T>(name: string, empty: T): Promise<T> {
  const value = await command(["GET", `nba-feed:${name}`]);
  if (value === null) return empty;
  if (typeof value !== "string") throw new Error("Invalid stored document");
  return JSON.parse(value) as T;
}

// Compare and swap atomically so concurrent quota reservations cannot overwrite each other.
const COMPARE_AND_SET = `
local current = redis.call('GET', KEYS[1])
if (ARGV[1] == '0' and not current) or (ARGV[1] == '1' and current == ARGV[2]) then
  redis.call('SET', KEYS[1], ARGV[3])
  return 1
end
return 0`;

export async function updateDocument<T>(name: string, empty: T, update: (value: T) => T): Promise<T> {
  const key = `nba-feed:${name}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await command(["GET", key]);
    if (current !== null && typeof current !== "string") throw new Error("Invalid stored document");
    const value = update(current === null ? empty : JSON.parse(current as string) as T);
    if (await command(["EVAL", COMPARE_AND_SET, 1, key, current === null ? "0" : "1", current as string ?? "", JSON.stringify(value)]) === 1) return value;
  }
  throw new Error("Storage changed concurrently. Please retry.");
}
