import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';

const allowedViews: Record<string, string> = {
  auth_methods: 'stats.vw_monthly_auth_method_stats',
  payment_types: 'stats.vw_monthly_payment_type_stats',
  request_types: 'stats.vw_monthly_request_type_stats',
  logins_channels: 'stats.vw_monthly_org_logins_channels',
  state_latest: 'stats.vw_state_metrics_latest',
  jobs_latest: 'stats.vw_job_runs_latest',
};

export async function GET(
  _req: Request,
  context: { params: { type: string } },
) {
  try {
    const view = allowedViews[context.params.type];
    if (!view) {
      return fail('Unknown report type', 404, { available: Object.keys(allowedViews) });
    }

    const result = await db().query(`SELECT * FROM ${view} LIMIT 1000`);
    return ok(result.rows);
  } catch (error) {
    return fail('Failed to load report', 500, (error as Error).message);
  }
}
