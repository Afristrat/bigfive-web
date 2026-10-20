import { describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import {
  MESSAGE_MAX,
  validateFields,
  type ExchangeLocale
} from '@/lib/presentation-fields';
import {
  buildAcknowledgementMail,
  buildNotificationMail,
  buildRecord,
  checkPresentationLimits,
  hashIp,
  ipFingerprint,
  mayAcknowledge,
  notificationRecipients,
  processPresentation,
  resolveIpSalt,
  screenBot,
  type OutgoingMail,
  type PresentationDeps,
  type PresentationEvent,
  type PresentationRecord
} from '@/lib/presentation-request';
import { createRateLimiter } from '@/lib/sliding-window';

const valid = {
  name: 'Salma Alaoui',
  organisation: 'Atlas Industrie',
  role: 'Directrice des ressources humaines',
  email: ' Salma.Alaoui@Atlas.MA ',
  size: 'from50to250',
  objective: 'teamwork',
  exchangeLocale: 'fr',
  message: 'Nous aimerions une présentation.',
  consent: 'on'
};

const SALT = 'un-sel-secret-de-test-assez-long';

describe('validateFields', () => {
  it('accepte une demande complète et met l’adresse en minuscules', () => {
    const result = validateFields(valid);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.email).toBe('salma.alaoui@atlas.ma');
  });

  it('refuse les adresses invalides', () => {
    for (const email of ['', 'sans-arobase', 'a@b', 'a b@c.ma', '@x.ma']) {
      const result = validateFields({ ...valid, email });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.fields.email).toBeDefined();
    }
  });

  it('refuse les champs trop longs et le message de plus de 1000 caractères', () => {
    const tooLong = validateFields({
      ...valid,
      name: 'x'.repeat(121),
      organisation: 'x'.repeat(161),
      message: 'x'.repeat(MESSAGE_MAX + 1)
    });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.fields.name).toBe('tooLong');
      expect(tooLong.fields.organisation).toBe('tooLong');
      expect(tooLong.fields.message).toBe('tooLong');
    }
    expect(
      validateFields({ ...valid, message: 'x'.repeat(MESSAGE_MAX) }).ok
    ).toBe(true);
  });

  it('compte un retour à la ligne CRLF pour un seul caractère', () => {
    const message = 'a\r\n'.repeat(MESSAGE_MAX / 2);
    expect(validateFields({ ...valid, message }).ok).toBe(true);
  });

  it('le message est facultatif, les autres champs et le consentement non', () => {
    expect(validateFields({ ...valid, message: undefined }).ok).toBe(true);
    const result = validateFields({
      ...valid,
      name: '  ',
      size: 'enorme',
      objective: undefined,
      exchangeLocale: 'de',
      consent: undefined
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fields).toMatchObject({
        name: 'required',
        size: 'choice',
        objective: 'choice',
        exchangeLocale: 'choice',
        consent: 'consent'
      });
    }
  });

  it('refuse l’octet nul et les caractères de contrôle', () => {
    for (const field of ['name', 'organisation', 'role', 'message'] as const) {
      const result = validateFields({ ...valid, [field]: `a${'\u0000'}b` });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.fields[field]).toBe('characters');
    }
    expect(validateFields({ ...valid, name: 'a\nb' }).ok).toBe(false);
  });
});

describe('screenBot', () => {
  it('piège déclenché si le champ invisible est rempli', () => {
    expect(
      screenBot({ website: 'http://spam.example', elapsedMs: '9000' })
    ).toBe('honeypot');
  });

  it('trop rapide, absent ou illisible : refusé ; sinon accepté', () => {
    expect(screenBot({ website: '', elapsedMs: '500' })).toBe('too_fast');
    expect(screenBot({ website: '', elapsedMs: undefined })).toBe('too_fast');
    expect(screenBot({ website: '', elapsedMs: 'abc' })).toBe('too_fast');
    expect(screenBot({ website: '', elapsedMs: '3000' })).toBeNull();
    expect(screenBot({ website: null, elapsedMs: '45000' })).toBeNull();
  });
});

describe('plafonds', () => {
  it('5 demandes par IP et par heure, la sixième est refusée', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 5; i += 1) {
      expect(checkPresentationLimits(limiter, '1.1.1.1', `u${i}@x.ma`)).toEqual(
        {
          limited: false
        }
      );
    }
    expect(checkPresentationLimits(limiter, '1.1.1.1', 'u9@x.ma')).toEqual({
      limited: true,
      scope: 'ip'
    });
  });

  it('3 demandes par adresse et par jour, alias compris', () => {
    const limiter = createRateLimiter();
    const addresses = ['a@x.ma', 'A@x.ma', 'a+2@x.ma'];
    addresses.forEach((address, i) =>
      expect(checkPresentationLimits(limiter, `2.2.2.${i}`, address)).toEqual({
        limited: false
      })
    );
    expect(checkPresentationLimits(limiter, '2.2.2.9', 'a+3@x.ma')).toEqual({
      limited: true,
      scope: 'address'
    });
  });

  it('plafond global de 200 accusés par jour', () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 200; i += 1) expect(mayAcknowledge(limiter)).toBe(true);
    expect(mayAcknowledge(limiter)).toBe(false);
  });
});

describe('empreinte de l’IP', () => {
  it('est un HMAC qui ne contient pas l’IP et dépend du sel', () => {
    const a = hashIp('203.0.113.7', SALT);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('203');
    expect(hashIp('203.0.113.7', SALT)).toBe(a);
    expect(hashIp('203.0.113.7', `${SALT}-autre`)).not.toBe(a);
  });

  it('refuse de stocker sans sel suffisant ou sans IP valide', () => {
    expect(resolveIpSalt({})).toBeNull();
    expect(resolveIpSalt({ PRESENTATION_IP_SALT: 'court' })).toBeNull();
    expect(ipFingerprint('203.0.113.7', {})).toBeNull();
    expect(
      ipFingerprint('no-cf-ip', { PRESENTATION_IP_SALT: SALT })
    ).toBeNull();
    expect(ipFingerprint('203.0.113.7', { PRESENTATION_IP_SALT: SALT })).toBe(
      hashIp('203.0.113.7', SALT)
    );
  });
});

describe('notificationRecipients', () => {
  it('PRESENTATION_RECIPIENT prime sur TENGA_ADMIN_EMAILS', () => {
    expect(
      notificationRecipients({
        PRESENTATION_RECIPIENT: 'Contact@Tenga.ma',
        TENGA_ADMIN_EMAILS: 'admin@tenga.ma'
      })
    ).toEqual(['contact@tenga.ma']);
  });

  it('à défaut, les administrateurs, sans doublon ni valeur invalide', () => {
    expect(
      notificationRecipients({
        TENGA_ADMIN_EMAILS: 'a@tenga.ma, b@tenga.ma;a@tenga.ma  nimporte'
      })
    ).toEqual(['a@tenga.ma', 'b@tenga.ma']);
  });

  it('aucune variable : liste vide', () => {
    expect(notificationRecipients({})).toEqual([]);
    expect(
      notificationRecipients({ PRESENTATION_RECIPIENT: 'pas-une-adresse' })
    ).toEqual([]);
  });
});

const record = (overrides: Partial<PresentationRecord> = {}) => {
  const parsed = validateFields(valid);
  if (!parsed.ok) throw new Error('fixture invalide');
  return {
    ...buildRecord(parsed.data, {
      pageLocale: 'fr',
      ipHash: null,
      now: new Date('2026-10-20T10:00:00Z')
    }),
    ...overrides
  };
};

const ATTACK = '<script>alert(1)</script> <img src=x onerror=alert(2)> "&\'';

describe('buildRecord', () => {
  it('statut « nouvelle », date de création, aucune IP brute', () => {
    const r = record();
    expect(r.statut).toBe('nouvelle');
    expect(r.createdAt).toBeInstanceOf(Date);
    expect(r.ipHash).toBeNull();
    expect(JSON.stringify(r)).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});

describe('notification à Tenga', () => {
  it('contient toutes les informations, en français, avec Reply-To', () => {
    const mail = buildNotificationMail(record());
    expect(mail.replyTo).toBe('salma.alaoui@atlas.ma');
    expect(mail.subject).toContain('Atlas Industrie');
    for (const part of [
      'Salma Alaoui',
      'Atlas Industrie',
      'Directrice des ressources humaines',
      'salma.alaoui@atlas.ma',
      '50 à 250',
      'Mieux travailler en équipe',
      'Français',
      'Nous aimerions une présentation.'
    ]) {
      expect(mail.html).toContain(part);
      expect(mail.text).toContain(part);
    }
  });

  it('échappe l’injection HTML dans le nom, l’organisation et le message', () => {
    const mail = buildNotificationMail(
      record({ nom: ATTACK, organisation: ATTACK, message: ATTACK })
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});

describe('accusé de réception', () => {
  const locales: ExchangeLocale[] = ['fr', 'en', 'ar'];

  it('a un contenu fixe : le constructeur ne reçoit que la langue', () => {
    // Aucune saisie (nom, organisation, message avec injection ou URL) ne peut
    // y entrer : la signature n'accepte que la langue, et le rendu est constant.
    for (const locale of locales) {
      const mail = buildAcknowledgementMail(locale);
      expect(buildAcknowledgementMail(locale)).toEqual(mail);
      const all = `${mail.subject}${mail.html}${mail.text}`;
      expect(all).not.toContain('<script');
      expect(all).not.toMatch(/href=|https?:\/\/|@/);
    }
  });

  it('existe dans les trois langues, sans promesse de délai', () => {
    expect(buildAcknowledgementMail('fr').text).toContain(
      'Un membre de Tenga Conseil vous répondra.'
    );
    expect(buildAcknowledgementMail('en').text).toContain('will reply');
    expect(buildAcknowledgementMail('ar').text).toContain('Tenga Conseil');
    for (const locale of locales) {
      expect(buildAcknowledgementMail(locale).text).not.toMatch(
        /\d+\s*(heures?|jours?|hours?|days?)|24|48/
      );
    }
  });

  it('rend l’arabe de droite à gauche', () => {
    const mail = buildAcknowledgementMail('ar');
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).toContain('lang="ar"');
    expect(buildAcknowledgementMail('fr').html).toContain('dir="ltr"');
    expect(buildAcknowledgementMail('en').html).toContain('dir="ltr"');
  });
});

describe('processPresentation', () => {
  const setup = (env: Record<string, string> = {}) => {
    const tasks: Array<() => Promise<void>> = [];
    const saved: PresentationRecord[] = [];
    const sent: OutgoingMail[] = [];
    const events: PresentationEvent[] = [];
    const deps: PresentationDeps = {
      limiter: createRateLimiter(),
      save: async (r) => {
        saved.push(r);
      },
      send: async (mail) => {
        sent.push(mail);
        return true;
      },
      defer: (task) => {
        tasks.push(task);
      },
      report: (event) => {
        events.push(event);
      },
      env: { PRESENTATION_RECIPIENT: 'contact@tenga.ma', ...env }
    };
    const flush = async () => {
      for (const task of tasks.splice(0)) await task();
    };
    return { deps, saved, sent, events, flush };
  };
  const input = (over: Record<string, unknown> = {}, ip = '203.0.113.7') => ({
    raw: { ...valid, ...over },
    website: '',
    elapsedMs: '20000',
    pageLocale: 'fr',
    ip
  });

  it('enregistre puis envoie la notification et l’accusé après la réponse', async () => {
    const { deps, saved, sent, flush } = setup({
      PRESENTATION_IP_SALT: SALT
    });
    const outcome = await processPresentation(deps, input());
    expect(outcome).toEqual({ status: 'success', detail: 'stored' });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.ipHash).toBe(hashIp('203.0.113.7', SALT));
    expect(sent).toHaveLength(0);
    await flush();
    expect(sent.map((m) => m.to).sort()).toEqual([
      'contact@tenga.ma',
      'salma.alaoui@atlas.ma'
    ]);
    const ack = sent.find((m) => m.to === 'salma.alaoui@atlas.ma');
    expect(ack?.replyTo).toBeUndefined();
    expect(ack?.text).not.toContain('Salma');
  });

  it('le pot de miel reçoit un succès neutre et rien n’est enregistré', async () => {
    const { deps, saved, sent, flush } = setup();
    const outcome = await processPresentation(deps, {
      ...input(),
      website: 'http://spam.example'
    });
    expect(outcome.status).toBe('success');
    await flush();
    expect(saved).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it('trop rapide : à renvoyer, rien d’enregistré', async () => {
    const { deps, saved } = setup();
    expect(
      await processPresentation(deps, { ...input(), elapsedMs: '100' })
    ).toEqual({ status: 'too_fast' });
    expect(saved).toHaveLength(0);
  });

  it('invalide : erreurs par champ, rien d’enregistré', async () => {
    const { deps, saved } = setup();
    const outcome = await processPresentation(deps, input({ email: 'x' }));
    expect(outcome.status).toBe('invalid');
    expect(saved).toHaveLength(0);
  });

  it('au dépassement du plafond : succès neutre, rien d’enregistré', async () => {
    const { deps, saved, events } = setup();
    for (let i = 0; i < 5; i += 1) {
      await processPresentation(deps, input({ email: `p${i}@x.ma` }));
    }
    const sixth = await processPresentation(deps, input({ email: 'p9@x.ma' }));
    expect(sixth).toEqual({ status: 'success', detail: 'rate_limited' });
    expect(saved).toHaveLength(5);
    expect(events).toContainEqual({
      event: 'presentation.rate_limited',
      scope: 'ip'
    });
  });

  it('sans sel : demande enregistrée sans empreinte, et journalisé', async () => {
    const { deps, saved, events } = setup();
    await processPresentation(deps, input());
    expect(saved[0]?.ipHash).toBeNull();
    expect(events).toContainEqual({ event: 'presentation.salt_missing' });
  });

  it('sans destinataire : demande enregistrée, absence journalisée, accusé envoyé', async () => {
    const { deps, saved, sent, events, flush } = setup({
      PRESENTATION_RECIPIENT: ''
    });
    await processPresentation(deps, input());
    await flush();
    expect(saved).toHaveLength(1);
    expect(events).toContainEqual({
      event: 'presentation.notification_unconfigured'
    });
    expect(sent.map((m) => m.to)).toEqual(['salma.alaoui@atlas.ma']);
  });

  it('un échec d’envoi laisse la demande enregistrée et le succès affiché, sans donnée dans le journal', async () => {
    const { deps, saved, events, flush } = setup();
    deps.send = vi.fn(async () => {
      throw new Error('boom salma.alaoui@atlas.ma');
    });
    const outcome = await processPresentation(deps, input());
    await flush();
    expect(outcome.status).toBe('success');
    expect(saved).toHaveLength(1);
    expect(
      events.filter((e) => e.event === 'presentation.send_failed')
    ).toHaveLength(2);
    expect(JSON.stringify(events)).not.toMatch(/salma|atlas|boom/i);
  });

  it('échec de l’enregistrement : pas de succès, aucun envoi', async () => {
    const { deps, sent, flush } = setup();
    deps.save = async () => {
      throw new Error('db down');
    };
    expect(await processPresentation(deps, input())).toEqual({
      status: 'failed'
    });
    await flush();
    expect(sent).toHaveLength(0);
  });

  it('au-delà de 200 accusés par jour, la demande reste enregistrée sans accusé', async () => {
    const { deps, saved, sent, events, flush } = setup();
    for (let i = 0; i < 200; i += 1) mayAcknowledge(deps.limiter);
    await processPresentation(deps, input());
    await flush();
    expect(saved).toHaveLength(1);
    expect(sent.map((m) => m.to)).toEqual(['contact@tenga.ma']);
    expect(events).toContainEqual({ event: 'presentation.ack_suppressed' });
  });
});

describe('messages « presentation » fr / en / ar', () => {
  type Tree = { [key: string]: string | Tree };
  const flatten = (tree: Tree, prefix = ''): string[] =>
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [`${prefix}${key}`]
        : flatten(value, `${prefix}${key}.`)
    );
  const catalogs = { fr, en, ar } as unknown as Record<
    'fr' | 'en' | 'ar',
    Record<string, Tree>
  >;

  it('mêmes clés dans les trois langues, mêmes variables', () => {
    const keys = (l: 'fr' | 'en' | 'ar') =>
      flatten(catalogs[l].presentation as Tree).sort();
    expect(keys('fr').length).toBeGreaterThan(30);
    expect(keys('en')).toEqual(keys('fr'));
    expect(keys('ar')).toEqual(keys('fr'));
    for (const l of ['fr', 'en', 'ar'] as const) {
      expect(typeof (catalogs[l].toolbar as unknown as Tree).presentation).toBe(
        'string'
      );
    }
  });

  it('ni tiret cadratin, ni mot interdit, ni chaîne vide ; nbsp en français', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      const text = JSON.stringify(catalogs[l].presentation);
      expect(text).not.toContain('""');
      expect(text).not.toContain('—');
      expect(text.toLowerCase()).not.toMatch(
        /gratuit|open source|scientifiquement|free of charge/
      );
    }
    const leaves = (tree: Tree): string[] =>
      Object.values(tree).flatMap((v) =>
        typeof v === 'string' ? [v] : leaves(v)
      );
    for (const text of leaves(catalogs.fr.presentation as Tree)) {
      expect(text).not.toMatch(/[^\s][?!:;]/);
    }
  });
});
