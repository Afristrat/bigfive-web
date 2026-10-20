import { timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { clearSink, readSink } from '@/lib/mail-sink';
import { isMailSinkAllowed } from '@/lib/startup-check';

export const dynamic = 'force-dynamic';

const notFound = (): Response => new Response(null, { status: 404 });

// Réceptacle de test lu par les parcours Playwright : n'existe (404 sinon) que
// si MAIL_SINK est actif en préproduction, et exige le jeton MAIL_SINK_TOKEN.
function authorized(request: NextRequest): boolean {
  if (!isMailSinkAllowed(process.env)) return false;
  const expected = Buffer.from(process.env.MAIL_SINK_TOKEN ?? '');
  const given = Buffer.from(request.headers.get('x-mail-sink-token') ?? '');
  return expected.length > 0 && given.length === expected.length
    ? timingSafeEqual(expected, given)
    : false;
}

export function GET(request: NextRequest): Response {
  if (!authorized(request)) return notFound();
  return Response.json(readSink(), {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export function DELETE(request: NextRequest): Response {
  if (!authorized(request)) return notFound();
  clearSink();
  return new Response(null, { status: 204 });
}
