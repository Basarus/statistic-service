import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { eventSchema } from '@/lib/schemas';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = eventSchema.safeParse(json);

    if (!parsed.success) {
      return fail('Validation error', 422, parsed.error.flatten());
    }

    const payload = parsed.data;

    const sql = `
      SELECT *
      FROM stats.ingest_event(
        $1::uuid, $2::text, $3::timestamptz,
        $4::uuid, $5::uuid, $6::uuid, $7::uuid,
        $8::stats.platform_type, $9::stats.auth_method_type,
        $10::text, $11::text, $12::boolean, $13::jsonb
      )
    `;

    const result = await db().query(sql, [
      payload.event_uuid,
      payload.event_type,
      payload.occurred_at,
      payload.organization_id ?? null,
      payload.user_id ?? null,
      payload.account_id ?? null,
      payload.ls_id ?? null,
      payload.platform ?? 'unknown',
      payload.auth_method ?? 'unknown',
      payload.request_type ?? null,
      payload.payment_type ?? null,
      payload.is_success ?? true,
      JSON.stringify(payload.payload ?? {}),
    ]);

    return ok(result.rows[0], 201);
  } catch (error) {
    return fail('Failed to ingest event', 500, (error as Error).message);
  }
}
