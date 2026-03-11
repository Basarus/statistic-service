# Event map from monolith to statistic-service

This document fixes the event contract that the monolith should send to the statistics service.

## Minimal required event set

| Domain | Event name | Status | Required dimensions |
|---|---|---|---|
| Authorization | `auth.login.success` | required | `platform`, `authMethod`, `organizationId`, `userId` |
| Authorization | `auth.login.failed` | optional | `platform`, `authMethod`, `organizationId`, `userId` |
| Payments | `payment.success` | required | `platform`, `organizationId`, `userId`, `providerId`, `payload.paymentType` |
| Meter readings | `meter.reading.sent` | required | `platform`, `organizationId`, `userId` |
| Receipt downloads | `receipt.downloaded` | required | `platform`, `organizationId`, `userId` |
| LKA requests | `request.lka.sent` | required | `platform`, `organizationId`, `userId`, `requestType` |
| Provider requests | `request.provider.sent` | required | `platform`, `organizationId`, `userId`, `providerId`, `requestType` |

## Second-wave events for business metrics

| Domain | Event name | Purpose |
|---|---|---|
| Account lifecycle | `user.created` | user base dynamics and conversion |
| Account lifecycle | `user.activated` | activation funnel |
| Account lifecycle | `user.deleted` | active base decay |
| Personal accounts | `account.linked` | conversion and linked-account dynamics |
| Personal accounts | `account.unlinked` | linked-account dynamics |

## Notes

- Events are sent to internal endpoint `POST /internal/events`.
- `auth.login.failed` is optional but useful for diagnostics and conversion analytics.
- `payment.success` should always provide `payload.paymentType`.
