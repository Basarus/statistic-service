import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { metricsFilterSchema } from '@/lib/schemas';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = metricsFilterSchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return fail('Validation error', 422, parsed.error.flatten());
    }

    const f = parsed.data;
    const result = await db().query(
      `
      SELECT *
      FROM stats.agg_monthly_metrics m
      WHERE ($1::date IS NULL OR m.metric_month >= $1::date)
        AND ($2::date IS NULL OR m.metric_month <= $2::date)
        AND ($3::uuid IS NULL OR m.organization_id = $3::uuid)
        AND ($4::text IS NULL OR m.event_type = $4::text)
        AND ($5::stats.platform_type IS NULL OR m.platform = $5::stats.platform_type)
      ORDER BY m.metric_month DESC
      LIMIT 1000
      `,
      [f.from ?? null, f.to ?? null, f.organization_id ?? null, f.event_type ?? null, f.platform ?? null],
    );

    return ok(result.rows);
  } catch (error) {
    return fail('Failed to load monthly metrics', 500, (error as Error).message);
  }
}
