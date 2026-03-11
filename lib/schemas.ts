import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const eventSchema = z.object({
  event_uuid: uuidSchema,
  event_type: z.string().min(1),
  occurred_at: z.string().datetime(),
  organization_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  account_id: uuidSchema.optional(),
  ls_id: uuidSchema.optional(),
  platform: z.enum(['web', 'mobile', 'api', 'unknown']).optional(),
  auth_method: z.enum(['email', 'phone', 'vk', 'sso', 'unknown']).optional(),
  request_type: z.string().optional(),
  payment_type: z.string().optional(),
  is_success: z.boolean().optional(),
  payload: z.record(z.unknown()).optional(),
});

export const runJobSchema = z.object({
  incremental_chunk_size: z.number().int().positive().max(200000).optional(),
  reconcile_lookback_days: z.number().int().min(0).max(30).optional(),
  retention_days: z.number().int().positive().max(3650).optional(),
});

export const metricsFilterSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  organization_id: uuidSchema.optional(),
  event_type: z.string().optional(),
  platform: z.enum(['web', 'mobile', 'api', 'unknown']).optional(),
});

export const settingsSchema = z.object({
  key: z.string().min(1),
  value: z.record(z.unknown()),
});
