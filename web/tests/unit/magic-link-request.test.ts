import { describe, expect, it, vi } from 'vitest';
import { requestMagicLink, type MagicLinkDeps } from '@/lib/magic-link-request';
import { createRateLimiter } from '@/lib/sliding-window';

const setup = (deliverError?: Error) => {
  const tasks: Array<() => Promise<void>> = [];
  const deliver = vi.fn(async (_address: string, _locale: string) => {
    if (deliverError) throw deliverError;
  });
  const reportError = vi.fn();
  const deps: MagicLinkDeps = {
    limiter: createRateLimiter(),
    deliver,
    defer: (t) => {
      tasks.push(t);
    },
    reportError
  };
  const flush = async () => {
    for (const t of tasks.splice(0)) await t();
  };
  return { deps, deliver, reportError, flush, tasks };
};
const ask = (email: string, ip = '1.1.1.1') => ({ email, locale: 'fr', ip });

describe('requestMagicLink', () => {
  it('renvoie la même réponse quelle que soit l’adresse', async () => {
    const { deps, flush } = setup();
    const a = requestMagicLink(deps, ask('connu@tenga.ma'));
    const b = requestMagicLink(deps, ask('inconnu@tenga.ma'));
    expect(a).toEqual(b);
    expect(a).toEqual({ status: 'sent' });
    await flush();
  });

  it('met l’adresse en minuscules avant tout appel à la base', async () => {
    const { deps, deliver, flush } = setup();
    requestMagicLink(deps, ask('  Connu@Tenga.MA '));
    await flush();
    expect(deliver).toHaveBeenCalledWith('connu@tenga.ma', 'fr');
  });

  it('ne fait aucun travail variable avant la réponse', () => {
    const { deps, deliver, tasks } = setup();
    requestMagicLink(deps, ask('a@tenga.ma'));
    expect(deliver).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(1);
  });

  it('rend visible un échec d’envoi sans changer la réponse', async () => {
    const boom = new Error('RESEND_API_KEY est absente');
    const { deps, reportError, flush } = setup(boom);
    expect(requestMagicLink(deps, ask('a@tenga.ma'))).toEqual({
      status: 'sent'
    });
    await flush();
    expect(reportError).toHaveBeenCalledWith(boom);
  });

  it('plafonne par adresse canonique, connue ou non, avec la même réponse', () => {
    const { deps } = setup();
    const out = [
      'a.b@gmail.com',
      'ab+1@gmail.com',
      'AB+2@gmail.com',
      'a.b+3@gmail.com'
    ].map((e, i) => requestMagicLink(deps, ask(e, `10.0.0.${i}`)).status);
    expect(out).toEqual(['sent', 'sent', 'sent', 'rate_limited']);
    expect(requestMagicLink(deps, ask('a.b@gmail.com', '10.0.9.9'))).toEqual({
      status: 'rate_limited',
      scope: 'address'
    });
  });

  it('plafonne par IP', () => {
    const { deps } = setup();
    const out = Array.from(
      { length: 11 },
      (_, i) => requestMagicLink(deps, ask(`u${i}@tenga.ma`)).status
    );
    expect(out.slice(0, 10)).toEqual(Array(10).fill('sent'));
    expect(out[10]).toBe('rate_limited');
  });

  it('ne programme aucun envoi quand le plafond est atteint', () => {
    const { deps, tasks } = setup();
    for (let i = 0; i < 11; i++) requestMagicLink(deps, ask(`u${i}@tenga.ma`));
    expect(tasks).toHaveLength(10);
  });
});
