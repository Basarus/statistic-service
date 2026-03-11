import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { runJobSchema } from '@/lib/schemas';

export async function POST(
  req: Request,
  context: { params: { jobName: string } },
) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = runJobSchema.safeParse(body);

    if (!parsed.success) {
      return fail('Validation error', 422, parsed.error.flatten());
    }

    if (context.params.jobName !== 'pipeline-tick') {
      return fail('Unsupported job', 404, { supported: ['pipeline-tick'] });
    }

    const cfg = parsed.data;
    const res = await db().query(
      `
      SELECT *
      FROM stats.run_pipeline_tick($1::int, $2::int, $3::int)
      `,
      [
        cfg.incremental_chunk_size ?? 50000,
        cfg.reconcile_lookback_days ?? 3,
        cfg.retention_days ?? 90,
      ],
    );

    return ok(res.rows[0]);
  } catch (error) {
    return fail('Failed to run job', 500, (error as Error).message);
  }
}
