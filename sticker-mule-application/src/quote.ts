import { JsonClient } from "./json-client.ts";

export interface Quote {
  total: number;
  currency: string;
}

export function isQuote(value: unknown): value is Quote {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.total === "number"
    && Number.isFinite(candidate.total)
    && candidate.total >= 0
    && typeof candidate.currency === "string"
    && /^[A-Z]{3}$/.test(candidate.currency);
}

// Illustrative only: no Sticker Mule API or production endpoint is called.
export async function fetchQuote(client: JsonClient, orderId: string): Promise<Quote> {
  return client.request(`quotes/${encodeURIComponent(orderId)}`, isQuote);
}
