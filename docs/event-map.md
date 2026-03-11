# Event map from monolith to statistic-service

This document fixes the minimal event contract that the monolith must send to the statistics service.

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

## Notes

- These events are expected on the internal endpoint `POST /internal/events`.
- `auth.login.failed` is optional but recommended for diagnostics and conversion analysis.
- `payload.paymentType` must be passed inside `payload` JSON object of the ingest DTO.
