import { describe, expect, it, vi } from 'vitest';
import { requestMagicLink, type MagicLinkDeps } from '@/lib/magic-link-request';
import { createRateLimiter } from '@/lib/sliding-window';

const setup = (eligible: (a: string) => boolean, deliverError?: Error) => {
  const tasks: Array<() => Promise<void>> = [];
  const deliver = vi.fn(async (_address: string, _locale: string) => {
    if (deliverError) throw deliverError;
  });
  const reportError = vi.fn();
  const deps: MagicLinkDeps = {
    limiter: createRateLimiter(),
    isEligible: async (a) => eligible(a),
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
  it('renvoie la même réponse pour une adresse connue et inconnue', async () => {
    const { deps, flush } = setup((a) => a === 'connu@tenga.ma');
    const known = requestMagicLink(deps, ask('connu@tenga.ma'));
    const unknown = requestMagicLink(deps, ask('inconnu@tenga.ma'));
    expect(known).toEqual(unknown);
    expect(known).toEqual({ status: 'sent' });
    await flush();
  });

  it('n’envoie que si l’adresse est éligible, en minuscules', async () => {
    const { deps, deliver, flush } = setup((a) => a === 'connu@tenga.ma');
    requestMagicLink(deps, ask('  Connu@Tenga.MA '));
    requestMagicLink(deps, ask('inconnu@tenga.ma'));
    await flush();
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith('connu@tenga.ma', 'fr');
  });

  it('ne fait aucun travail variable avant la réponse', () => {
    const { deps, deliver, tasks } = setup(() => true);
    requestMagicLink(deps, ask('a@tenga.ma'));
    expect(deliver).not.toHaveBeenCalled();
    expect(tasks).toHaveLength(1);
  });

  it('rend visible un échec d’envoi sans changer la réponse', async () => {
    const boom = new Error('RESEND_API_KEY est absente');
    const { deps, reportError, flush } = setup(() => true, boom);
    expect(requestMagicLink(deps, ask('a@tenga.ma'))).toEqual({
      status: 'sent'
    });
    await flush();
    expect(reportError).toHaveBeenCalledWith(boom);
  });

  it('plafonne par adresse canonique, connue ou non, avec la même réponse', () => {
    const { deps } = setup(() => false);
    const out = [
      'a.b@gmail.com',
      'ab+1@gmail.com',
      'AB+2@gmail.com',
      'a.b+3@gmail.com'
    ].map((e, i) => requestMagicLink(deps, ask(e, `10.0.0.${i}`)).status);
    expect(out).toEqual(['sent', 'sent', 'sent', 'rate_limited']);
  });

  it('plafonne par IP', () => {
    const { deps } = setup(() => false);
    const out = Array.from(
      { length: 6 },
      (_, i) => requestMagicLink(deps, ask(`u${i}@tenga.ma`)).status
    );
    expect(out).toEqual([
      'sent',
      'sent',
      'sent',
      'sent',
      'sent',
      'rate_limited'
    ]);
  });

  it('ne programme aucun envoi quand le plafond est atteint', () => {
    const { deps, tasks } = setup(() => true);
    for (let i = 0; i < 6; i++) requestMagicLink(deps, ask(`u${i}@tenga.ma`));
    expect(tasks).toHaveLength(5);
  });
});
