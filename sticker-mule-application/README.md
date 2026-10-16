# Validating JSON at a service boundary

An HTTP request can succeed while its response is unusable. For example, a quoting service might return `{"total":"149.50","currency":"USD"}`. The JSON parses, but the amount is a string. Declaring the result as `Promise<Quote>` does not check that value at runtime.

This standalone TypeScript example checks the response before returning it to its caller. The design is informed by my experience connecting a Node API to a Python prediction service in a healthcare application. I prepared this application sample with AI assistance. It uses an illustrative quoting contract and test fixtures.

## Request and response handling

`JsonClient.request` accepts a type guard with the request. The client parses the response into `unknown`; the guard must accept it before the result can be returned as `T`. The example guard requires a finite, non-negative amount and a three-letter uppercase currency code. It accepts zero without coercing strings into numbers.

The client distinguishes failures that require different treatment:

| Failure | Meaning |
| --- | --- |
| `timeout` | The request exceeded its configured deadline. |
| `network` | Fetching the response or reading its body failed before the deadline. |
| `http` | The service returned an unsuccessful HTTP status. |
| `json` | A successful response did not contain valid JSON. |
| `schema` | The JSON failed the expected response contract. |

An unsuccessful HTTP response retains its status for diagnostics. Its body is not copied into the error message. The application using this client can decide how to map these categories to its own HTTP responses and logs.

## The deadline includes reading the body

Receiving headers does not mean the request has finished. A server can send headers and then stall while sending the body. The abort timer therefore remains active across both `fetch()` and `response.text()`. A `finally` block clears the timer when that work finishes.

The default fetch implementation must honor `AbortSignal`; the tests inject compatible fetch functions so both stalled-header and stalled-body behavior can be checked without calling a real service. JSON parsing and the synchronous type guard run after the I/O deadline is cleared.

The configured base URL preserves an API path such as `/api/`. Explicit URLs that change the service origin are rejected, and automatic redirects are disabled. The quote example encodes its order identifier as a path segment.

## Keeping retry decisions with the operation

The client does not retry automatically. A timed-out POST might already have been processed upstream. Retrying it safely requires knowledge of that operation, such as an idempotency key or an explicitly read-only contract. A generic client should not assume either.

This example handles small JSON responses and buffers each body in memory. A byte limit would be an appropriate addition for endpoints with large or untrusted payloads. Streaming responses and caller-controlled cancellation would need separate interfaces. No production load or performance benchmark is claimed for this sample.

## Run the example's tests

Use Node.js 24 or newer:

```sh
npm test
```

There are no package dependencies to install. The tests cover a valid response, POST serialization, HTTP and network failures, malformed JSON, a mismatched contract, an empty body, both stages of a timeout, timer cleanup, configuration errors, origin changes, invalid GET bodies, and quote validation.

Files:

- `src/json-client.ts`: the client and its failure categories.
- `src/quote.ts`: an example contract and consumer.
- `test/json-client.test.mjs`: executable behavior checks.

This README is the technical writing sample. `APPLICATION_ANSWERS.md` contains the separate application form drafts.
