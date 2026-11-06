export type ProductEvent =
  | { name: "team_selected"; team_id: number; source: "your_teams" }
  | { name: "teams_following_updated"; count: number };

type ProductEventListener = (event: ProductEvent) => void;

const listeners = new Set<ProductEventListener>();

/** In-process product events. Nothing is sent to a network or written to storage. */
export function recordProductEvent(event: ProductEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeProductEvents(listener: ProductEventListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
