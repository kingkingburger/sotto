import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';

/**
 * JSON 파싱 + Zod 검증을 하나로 묶은 POST 라우트 헬퍼.
 * 성공 시 `{ data }`, 실패 시 `{ error: NextResponse }` 반환.
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { error: parsed.error.issues.map((i) => i.message).join(', ') },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}
