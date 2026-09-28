import { db } from '@/server/db';
import { requireAdmin, audit } from '@/server/auth';
import { sameOrigin, error, ok, guardError } from '@/server/http';
import { DEFAULT_MODEL, MODEL_OPTIONS } from '@/config/models';
export async function GET() {
  try {
    await requireAdmin();
    const row = await (
      await db()
    )
      .collection<{ _id: string; [key: string]: any }>('settings')
      .findOne({ _id: 'ai' });
    return ok({
      mode: 'single',
      model: row?.model || DEFAULT_MODEL,
      options: MODEL_OPTIONS,
    });
  } catch (e) {
    return guardError(e);
  }
}
export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const user = await requireAdmin();
    const { model } = await req.json();
    if (!MODEL_OPTIONS.includes(model)) return error('Model not allowed');
    if (!process.env.GROQ_API_KEY) return error('Groq is not configured', 503);
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return error('Could not verify Groq model availability', 503);
    const body = (await res.json()) as { data?: { id: string }[] };
    if (!body.data?.some((x) => x.id === model))
      return error('Model is not available for this account', 400);
    const probe = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'eligibility_probe',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['needs_verification', 'satisfied', 'not_satisfied'],
                  },
                },
              },
            },
          },
          messages: [
            {
              role: 'system',
              content:
                'Return JSON only. Missing company evidence must be needs_verification.',
            },
            {
              role: 'user',
              content:
                'Tender requires ISO 27001. No company evidence is available. What is the status?',
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const result = (await probe.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    let status = '';
    try {
      status = JSON.parse(result.choices?.[0]?.message?.content || '{}').status;
    } catch {}
    if (!probe.ok || status !== 'needs_verification')
      return error('Model failed the structured-output safety check', 400);
    await (
      await db()
    )
      .collection<{ _id: string; [key: string]: any }>('settings')
      .updateOne(
        { _id: 'ai' },
        {
          $set: {
            model,
            mode: 'single',
            updatedBy: user.sub,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );
    await audit(user.sub, 'ai_model_changed', { model, probe: 'passed' });
    return ok({ model, mode: 'single' });
  } catch (e) {
    return guardError(e);
  }
}
