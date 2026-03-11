import { db } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { settingsSchema } from '@/lib/schemas';

export async function PATCH(req: Request) {
  try {
    const json = await req.json();
    const parsed = settingsSchema.safeParse(json);
    if (!parsed.success) {
      return fail('Validation error', 422, parsed.error.flatten());
    }

    const { key, value } = parsed.data;
    await db().query(
      `
      INSERT INTO stats.admin_settings(key, value, updated_at)
      VALUES ($1::text, $2::jsonb, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
      [key, JSON.stringify(value)],
    );

    return ok({ key, value });
  } catch (error) {
    return fail('Failed to update settings', 500, (error as Error).message);
  }
}

export async function GET() {
  try {
    const result = await db().query('SELECT key, value, updated_at FROM stats.admin_settings ORDER BY key');
    return ok(result.rows);
  } catch (error) {
    return fail('Failed to load settings', 500, (error as Error).message);
  }
}
