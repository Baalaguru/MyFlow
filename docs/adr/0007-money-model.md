# ADR-0007: Money model

- **Status:** Accepted
- **Date:** 2026-11-22
- **Related:** D-02, D-03, [ADR-0006](0006-time-model.md)

## Context

Finance tracking uses INR amounts. Floating-point money causes rounding errors, and the v1 scope is expenses only while income/budgets/cards are deferred. The schema must be correct now without building deferred workflows.

## Decision

- Store amounts as `amount_minor BIGINT` — integer paise (1 INR = 100 paise).
- Store `currency CHAR(3)` with `INR` for v1; formatting is locale-aware via `Intl.NumberFormat` / `java.text.NumberFormat`.
- Amounts are positive magnitudes; the entity name (`Expense`) supplies direction so income can be added later without changing existing rows.
- No floating point in storage, calculation, or transport; division rounding rules are defined in the calculation spec.
- `card_label` is optional text on `Expense`, shown only when payment method is Credit Card. No `CreditCard`, `Budget`, or `Income` table in v1.
- Validation rejects zero, negative, non-integer, and overflowing amounts.

## Consequences

**Positive**

- Exact sums and category shares; no drift in reports.
- Income can be introduced later as a separate entity without a data migration.
- Multi-currency is not precluded but is not attempted.

**Negative**

- UI must convert to/from major units explicitly and carefully.
- Users see paise internally in debug/export formats, which must be documented.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| `DECIMAL(12,2)` / floating point | Rounding and cross-platform inconsistency |
| Store formatted strings | Cannot compute or validate reliably |
| Build income/budgets/cards now | Explicitly deferred by D-02/D-03 |

## Verification

Unit fixtures cover maximum values, zero/negative rejection, category share with zero total, and formatting in `en-IN` and `ta-IN` locales on both clients.
