import assert from "node:assert/strict";
import { test } from "node:test";
import { JsonClient, ServiceFailure } from "../src/json-client.ts";
import { fetchQuote, isQuote } from "../src/quote.ts";

const good = { total: 149.5, currency: "USD" };
const makeClient = (fetcher, timeoutMs = 250) => new JsonClient({
  baseUrl: "https://supplier.example/api/",
  timeoutMs,
  fetcher,
});
const failure = (kind, status) => error => {
  assert.ok(error instanceof ServiceFailure);
  assert.equal(error.kind, kind);
  if (status !== undefined) assert.equal(error.upstreamStatus, status);
  return true;
};

test("a valid response reaches the caller and preserves the service base path", async () => {
  let received;
  const client = makeClient(async (url, init) => {
    received = { url: String(url), init };
    return Response.json(good);
  });
  assert.deepEqual(await fetchQuote(client, "order/42?x=1"), good);
  assert.equal(received.url, "https://supplier.example/api/quotes/order%2F42%3Fx%3D1");
  assert.equal(received.init.headers.get("accept"), "application/json");
  assert.equal(received.init.redirect, "error");
});

test("POST sends JSON with caller headers", async () => {
  const client = makeClient(async (_url, init) => {
    assert.equal(init.method, "POST");
    assert.equal(init.headers.get("content-type"), "application/json");
    assert.equal(init.headers.get("x-request-id"), "sample-42");
    assert.deepEqual(JSON.parse(init.body), { quantity: 100 });
    return Response.json(good);
  });
  await client.request("quotes", isQuote, {
    method: "POST", body: { quantity: 100 }, headers: { "x-request-id": "sample-42" },
  });
});

test("an HTTP failure retains its status and does not expose the response body", async () => {
  const client = makeClient(async () => new Response("private upstream diagnostics", { status: 503 }));
  await assert.rejects(client.request("quotes", isQuote), error => {
    failure("http", 503)(error);
    assert.ok(!error.message.includes("private upstream diagnostics"));
    return true;
  });
});

test("a network failure retains its cause", async () => {
  const cause = new TypeError("connection refused");
  const client = makeClient(async () => { throw cause; });
  await assert.rejects(client.request("quotes", isQuote), error => {
    failure("network")(error);
    assert.equal(error.cause, cause);
    return true;
  });
});

test("malformed successful JSON is rejected", async () => {
  const client = makeClient(async () => new Response("{broken"));
  await assert.rejects(client.request("quotes", isQuote), failure("json", 200));
});

test("valid JSON with the wrong shape is rejected", async () => {
  const client = makeClient(async () => Response.json({ total: "149.50", currency: "USD" }));
  await assert.rejects(client.request("quotes", isQuote), failure("schema", 200));
});

test("an empty successful body is rejected by this JSON-only contract", async () => {
  const client = makeClient(async () => new Response(null, { status: 204 }));
  await assert.rejects(client.request("quotes", isQuote), failure("json", 204));
});

test("deadline expiration aborts a request waiting for headers", async () => {
  let aborted = false;
  const client = makeClient(async (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => {
      aborted = true;
      reject(new DOMException("aborted", "AbortError"));
    }, { once: true });
  }), 25);
  await assert.rejects(client.request("quotes", isQuote), failure("timeout"));
  assert.equal(aborted, true);
});

test("the same deadline also covers reading a stalled body", async () => {
  const client = makeClient(async (_url, { signal }) => new Response(new ReadableStream({
    start(controller) {
      signal.addEventListener("abort", () => {
        controller.error(new DOMException("aborted", "AbortError"));
      }, { once: true });
    },
  })), 25);
  await assert.rejects(client.request("quotes", isQuote), failure("timeout"));
});

test("a completed request clears its deadline timer", async () => {
  let signal;
  const client = makeClient(async (_url, init) => {
    signal = init.signal;
    return Response.json(good);
  }, 25);
  await client.request("quotes", isQuote);
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(signal.aborted, false);
});

test("an absolute path cannot redirect the client to a different origin", async () => {
  let calls = 0;
  const client = makeClient(async () => { calls += 1; return Response.json(good); });
  await assert.rejects(client.request("https://other.example/quotes", isQuote), TypeError);
  assert.equal(calls, 0);
});

test("invalid deadlines and service URL configuration fail before making a request", () => {
  for (const timeoutMs of [0, -1, NaN, Infinity]) {
    assert.throws(() => makeClient(fetch, timeoutMs), RangeError);
  }
  for (const baseUrl of ["file:///tmp/data", "https://u:p@example.com/", "https://example.com/?a=1"]) {
    assert.throws(() => new JsonClient({ baseUrl }), TypeError);
  }
});

test("a GET body is treated as a caller error before any network request", async () => {
  let calls = 0;
  const client = makeClient(async () => { calls += 1; return Response.json(good); });
  await assert.rejects(client.request("quotes", isQuote, { body: { quantity: 1 } }), TypeError);
  assert.equal(calls, 0);
});

test("quote validation accepts zero and rejects invalid values without coercion", () => {
  assert.equal(isQuote({ total: 0, currency: "USD" }), true);
  for (const input of [null, [], {}, { total: -1, currency: "USD" },
    { total: NaN, currency: "USD" }, { total: Infinity, currency: "USD" },
    { total: 1, currency: "usd" }, { total: "1", currency: "USD" }]) {
    assert.equal(isQuote(input), false);
  }
});
