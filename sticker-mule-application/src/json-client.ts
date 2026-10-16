export type FailureKind = "timeout" | "network" | "http" | "json" | "schema";
export type Guard<T> = (value: unknown) => value is T;

export class ServiceFailure extends Error {
  readonly kind: FailureKind;
  readonly upstreamStatus?: number;

  constructor(kind: FailureKind, message: string, upstreamStatus?: number, cause?: unknown) {
    super(message, { cause });
    this.name = "ServiceFailure";
    this.kind = kind;
    this.upstreamStatus = upstreamStatus;
  }
}

export interface ClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export type JsonRequest =
  | { method?: "GET"; body?: never; headers?: HeadersInit }
  | { method: "POST"; body?: unknown; headers?: HeadersInit };

/** A deadline covers both receiving headers and reading the response body. */
export class JsonClient {
  private readonly baseUrl: URL;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor({ baseUrl, timeoutMs = 2500, fetcher = fetch }: ClientConfig) {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new TypeError("baseUrl must use HTTP or HTTPS.");
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new RangeError("timeoutMs must be a positive, finite number.");
    }
    if (url.search || url.hash || url.username || url.password) {
      throw new TypeError("baseUrl must not contain credentials, a query, or a fragment.");
    }
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    this.baseUrl = url;
    this.timeoutMs = timeoutMs;
    this.fetcher = fetcher;
  }

  async request<T>(path: string, isExpected: Guard<T>, options: JsonRequest = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (url.origin !== this.baseUrl.origin) {
      throw new TypeError("Requests must stay on the configured service origin.");
    }

    const method = options.method ?? "GET";
    if (method === "GET" && options.body !== undefined) {
      throw new TypeError("GET requests must not include a body.");
    }
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    const body = options.body === undefined ? undefined : JSON.stringify(options.body);
    if (body !== undefined) headers.set("Content-Type", "application/json");

    const controller = new AbortController();
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      controller.abort();
    }, this.timeoutMs);

    let response: Response;
    let text: string;
    try {
      response = await this.fetcher(url, {
        method,
        headers,
        body,
        signal: controller.signal,
        redirect: "error",
      });
      text = await response.text();
    } catch (cause) {
      if (expired) {
        throw new ServiceFailure("timeout", "Service request exceeded its deadline.", undefined, cause);
      }
      throw new ServiceFailure("network", "Service request could not complete.", undefined, cause);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // Keep the status for diagnostics, without forwarding an arbitrary error body.
      throw new ServiceFailure("http", "Service returned an unsuccessful status.", response.status);
    }

    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (cause) {
      throw new ServiceFailure("json", "Service returned invalid JSON.", response.status, cause);
    }
    if (!isExpected(value)) {
      throw new ServiceFailure("schema", "Service response did not match its contract.", response.status);
    }
    return value;
  }
}
