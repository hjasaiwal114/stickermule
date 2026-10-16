# Sticker Mule software engineer application

Prepared for Himanshu Jasaiwal on 17 October 2026.

Role: https://www.stickermule.com/career/6db27241-e2d4-4f35-a2c4-b58d84621843

## Form fields

Name: Himanshu Jasaiwal

Email: hjasaiwal114@gmail.com

GitHub: https://github.com/hjasaiwal114

Location: Bengaluru, India (UTC+5:30)

Code sample: Upload `src/json-client.ts`, `src/quote.ts`, `test/json-client.test.mjs`, `package.json`, and `README.md` to an unlisted GitHub gist. Use its resulting URL. This packet does not yet have a hosted code-sample URL.

Technical writing: Link to `README.md` in the same gist. The form also accepts the full text of that README.

How did you hear about us?: Use the actual source where you found the opening. If you found it through an online job search, enter: Online job listing.

## Why are you proud of the code?

I chose this sample because it captures a problem I've dealt with while connecting a TypeScript API to a Python prediction service: callers need predictable behavior when a dependency times out or returns unexpected data.

This standalone version checks successful responses at runtime, keeps timeout, network, HTTP, and validation failures distinct, and applies its deadline while reading the response body as well as waiting for headers. The tests cover those failure paths and verify that completed requests clear their timers.

I also kept retry decisions outside the client. A timed-out request may already have been processed, so retrying it safely depends on the operation's idempotency guarantees.

I prepared this application sample with AI assistance, using the service-integration work I've done as its starting point. I like that it is small enough to review and run while making its behavior and limitations explicit.

## Positioning for a cover note or an interview introduction

I'm a full-stack engineer who has shipped product workflows and production systems across healthcare, industrial IoT, and commerce. At HURC, I built a React/Node/FastAPI healthcare ML platform. At Senzary, I reduced ingestion errors from 64% to 0% and shipped SSO across 29 enterprise accounts. At AppX (YC S21), I shipped onboarding and commerce workflows. Sticker Mule's product engineering work connects with that combination of customer-facing features and production reliability.

## Application preparation notes

- Lead with TypeScript/React product work, production APIs, and Postgres experience. Use AppX for commerce relevance and HURC for ownership across services.
- The employer's current listing names Go, TypeScript, React, Expo, GraphQL, Postgres, and GCP. This packet claims no unverified production experience in Go, Expo, or GraphQL.
- The employer advertises a remote team across more than 40 countries. The reviewed posting does not explicitly name India; use your actual location in the form.
- The selected HURC source is in a private repository. Its private URL alone will not let reviewers read it. The standalone sample in this packet uses an illustrative API and contains no hospital datasets, model files, credentials, or employer endpoints.
- The sample was prepared for this application. Present it as an AI-assisted standalone example, rather than claiming this exact implementation has already run in production.
- Before an interview, be able to explain the runtime type guard, the timeout covering the response body, and why retries belong to the operation. Those choices are likely discussion points; this is preparation advice, not a claim about Sticker Mule's interview process.

No application has been submitted and no outreach has been sent for this role.
