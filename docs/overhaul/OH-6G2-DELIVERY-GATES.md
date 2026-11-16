# OH-6G2 — Reminder Delivery Gates & Durable Outbox

Status: package delivered, awaiting repository tests and live read-only acceptance.

## Design

OH-6G1 is the schedule authority; OH-6F2/F3 are the attention/notification policy authority. G2 adds an explicitly bounded reminder-delivery gate and a durable reservation ledger **without activating any transport**.

New files:
- `packages/personal-assistance/src/reminders/deliveryGate.ts`: pure eligibility decisions. DND is absolute, including critical priorities; busy and away defer. No bypass switch is created.
- `packages/personal-assistance/src/reminders/deliveryOutbox.ts`: SQLite-backed, one row per reminder ID; atomic, time-limited 2-minute reservations, renewal after expiry, acknowledgement of a verified transport receipt. Not wired to a network sender in G2.
- `packages/personal-assistance/src/reminders/deliveryHealth.ts`: deterministic, bounded report excluding reminder titles.
- `app/api/personal-assistance/reminders/delivery/health/route.ts`: GET-only health endpoint.
- `scripts/verify-oh6g2-delivery-gates.ts`: isolated in-memory behavioural tests.

## Safety boundaries

- No G2 HTTP POST/PATCH/DELETE, no background worker, no phone push, no messages, no policy changes, no permission grants, no calendar writes.
- `candidate` from OH-6G1 remains advisory only. A future sender must use a reservation **and** revalidate live attention and preferences immediately before actual send.
- The reservation is **not** permission to deliver and does not change an existing reminder.
- `acknowledgeTransportSuccess` is a library method only. OH-6G2 exposes no production call path to fabricate acknowledgements. OH-6G3 must call it only after receiving a real transport receipt.
- DND cannot be bypassed, including for critical reminders. Existing `proactiveAssistanceEnabled: false` remains untouched.
- The outbox uses `personal_assistance_reminder_delivery_v1` in the PA-owned SQLite database; existing reminder schema and personal data are preserved.
- No exactly-once claim for external message delivery: G3 must supply a transport idempotency key derived from the stable reminder ID and handle retries/receipts safely. An expired reservation is not proof of failed send.
- Initial schema creation is idempotent; GET does not create/cancel/reserve or acknowledge reminder deliveries.

## Acceptance

1. Installation passes the G2 verifier, G1 + F3 + F2 regressions, TypeScript, ESLint and Git whitespace.
2. `GET /api/personal-assistance/reminders/delivery/health?limit=25` returns `ok:true`, `boundaries.sendsMessages:false`, `boundaries.reservesDeliveries:false`, and `boundaries.overridesDoNotDisturb:false`.
3. With proactive assistance disabled, all due reminders are blocked rather than eligible; future reminders are `not-due`.
4. In-memory tests establish deterministic reservations, concurrent/no-double-active lease protection, expired lease replacement, cancellation/DND revalidation, and acknowledgement replay protection.
5. OH-6G1's temporary acceptance reminder, if still active, should be explicitly cancelled via the existing local management command before final G1 closure.

OH-6G3 is reserved for integrating a trusted, testable transport and end-to-end acknowledgements with user-controlled approval. Do not enable proactive assistance as a side effect of this installation.
