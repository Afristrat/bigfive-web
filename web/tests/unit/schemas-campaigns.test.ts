import { describe, expect, it } from 'vitest';
import {
  campaignCloseSchema,
  campaignCreateSchema,
  campaignIdSchema,
  inviteParticipantsSchema,
  memberInviteSchema
} from '@/schemas/campaigns';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const ok = (
  schema: { safeParse: (v: unknown) => { success: boolean } },
  v: unknown
) => schema.safeParse(v).success;

describe('campaignCreateSchema', () => {
  const base = {
    organisation: uuid,
    slug: 'acme',
    titre: 'Cohorte 1',
    langue: 'fr'
  };

  it('accepte une création valide et normalise le slug', () => {
    expect(campaignCreateSchema.parse({ ...base, slug: ' ACME ' }).slug).toBe(
      'acme'
    );
  });

  it('refuse organisation non uuid, titre vide ou trop long, langue inconnue', () => {
    expect(ok(campaignCreateSchema, { ...base, organisation: 'x' })).toBe(
      false
    );
    expect(ok(campaignCreateSchema, { ...base, titre: '  ' })).toBe(false);
    expect(ok(campaignCreateSchema, { ...base, titre: 'a'.repeat(161) })).toBe(
      false
    );
    expect(ok(campaignCreateSchema, { ...base, titre: 'a'.repeat(160) })).toBe(
      true
    );
    expect(ok(campaignCreateSchema, { ...base, langue: 'es' })).toBe(false);
  });

  it('refuse un caractère de contrôle dans le titre', () => {
    expect(ok(campaignCreateSchema, { ...base, titre: 'a\nb' })).toBe(false);
    expect(ok(campaignCreateSchema, { ...base, titre: 'a\u0000b' })).toBe(
      false
    );
  });

  it('refuse lien, domaine nu et invisibles dans le titre, accepte les points ordinaires', () => {
    for (const titre of [
      'voir evil.example/login',
      'exemple.ma',
      'ab\u200Bc',
      'https://x.org'
    ]) {
      expect(ok(campaignCreateSchema, { ...base, titre })).toBe(false);
    }
    expect(
      ok(campaignCreateSchema, { ...base, titre: 'Campagne 2026. Lot 1' })
    ).toBe(true);
  });

  it('refuse un slug avec esperluette, barre oblique ou double tiret', () => {
    for (const slug of [
      'a&amp;b',
      'ac/me',
      'ac--me',
      'a',
      '-acme',
      'acme?x=1'
    ]) {
      expect(ok(campaignCreateSchema, { ...base, slug })).toBe(false);
    }
  });
});

describe('campaignIdSchema et campaignCloseSchema', () => {
  it('exigent un uuid et un slug valides', () => {
    expect(ok(campaignIdSchema, { campagne: uuid, slug: 'acme' })).toBe(true);
    expect(ok(campaignIdSchema, { campagne: 'x', slug: 'acme' })).toBe(false);
    expect(ok(campaignIdSchema, { campagne: uuid, slug: 'a&b' })).toBe(false);
  });

  it('exigent confirmer=oui pour la clôture', () => {
    const base = { campagne: uuid, slug: 'acme' };
    expect(ok(campaignCloseSchema, { ...base, confirmer: 'oui' })).toBe(true);
    expect(ok(campaignCloseSchema, base)).toBe(false);
    expect(ok(campaignCloseSchema, { ...base, confirmer: 'non' })).toBe(false);
    expect(ok(campaignCloseSchema, { ...base, confirmer: 'on' })).toBe(false);
  });
});

describe('inviteParticipantsSchema', () => {
  const base = {
    campagne: uuid,
    slug: 'acme',
    adresses: 'a@exemple.org',
    langue: 'fr'
  };

  it('accepte sans message et lit un message blanc comme absent', () => {
    expect(ok(inviteParticipantsSchema, base)).toBe(true);
    expect(
      inviteParticipantsSchema.parse({ ...base, message: '   ' }).message
    ).toBeUndefined();
  });

  it('accepte un message avec retours à la ligne', () => {
    expect(
      inviteParticipantsSchema.parse({
        ...base,
        message: ' Bonjour\nà bientôt '
      }).message
    ).toBe('Bonjour\nà bientôt');
  });

  it('refuse un lien, www., caractères bidi et contrôles', () => {
    for (const message of [
      'voir http://x.org',
      'voir HTTPS://x.org',
      'voir www.x.org',
      'abc\u202Edef',
      'abc\u202Adef',
      'abc\u2066def',
      'abc\u2069def',
      'abc\u0007def'
    ]) {
      expect(ok(inviteParticipantsSchema, { ...base, message })).toBe(false);
    }
  });

  it('accepte un message multiligne en CRLF venu d’un textarea et le normalise', () => {
    expect(
      inviteParticipantsSchema.parse({
        ...base,
        message: 'Bonjour\r\nà bientôt'
      }).message
    ).toBe('Bonjour\nà bientôt');
    expect(
      inviteParticipantsSchema.parse({ ...base, message: 'a\rb' }).message
    ).toBe('a\nb');
  });

  it('compte le plafond de 1000 après normalisation des CRLF', () => {
    const crlf = `${'a'.repeat(499)}\r\n${'b'.repeat(500)}`;
    expect(crlf).toHaveLength(1001);
    expect(
      inviteParticipantsSchema.parse({ ...base, message: crlf }).message
    ).toHaveLength(1000);
    expect(
      ok(inviteParticipantsSchema, {
        ...base,
        message: `${'a'.repeat(500)}\r\n${'b'.repeat(500)}`
      })
    ).toBe(false);
  });

  it('refuse domaine nu, adresse et invisibles dans le message libre', () => {
    for (const message of [
      'voir evil.example/login',
      'écrire à a@exemple.org',
      'ab\u200Bc',
      'mailto:x'
    ]) {
      expect(ok(inviteParticipantsSchema, { ...base, message })).toBe(false);
    }
    expect(
      ok(inviteParticipantsSchema, { ...base, message: 'می\u200Cخواهم' })
    ).toBe(true);
  });

  it('borne le message à 1000 caractères', () => {
    expect(
      ok(inviteParticipantsSchema, { ...base, message: 'a'.repeat(1000) })
    ).toBe(true);
    expect(
      ok(inviteParticipantsSchema, { ...base, message: 'a'.repeat(1001) })
    ).toBe(false);
  });

  it('borne la liste d’adresses à 4000 caractères', () => {
    expect(
      ok(inviteParticipantsSchema, { ...base, adresses: 'a'.repeat(4000) })
    ).toBe(true);
    expect(
      ok(inviteParticipantsSchema, { ...base, adresses: 'a'.repeat(4001) })
    ).toBe(false);
  });

  it('refuse un uuid ou un slug invalide', () => {
    expect(ok(inviteParticipantsSchema, { ...base, campagne: 'x' })).toBe(
      false
    );
    expect(ok(inviteParticipantsSchema, { ...base, slug: 'a/b' })).toBe(false);
  });
});

describe('temps borné des schémas à texte libre', () => {
  const huge = 'a.'.repeat(50_000);
  const elapsed = (run: () => boolean): { ms: number; accepted: boolean } => {
    const start = performance.now();
    const accepted = run();
    return { ms: performance.now() - start, accepted };
  };

  it('refuse un message de 100 000 caractères en moins de 200 ms', () => {
    const { ms, accepted } = elapsed(() =>
      ok(inviteParticipantsSchema, {
        campagne: uuid,
        slug: 'acme',
        adresses: 'a@b.ma',
        langue: 'fr',
        message: huge
      })
    );
    expect(accepted).toBe(false);
    expect(ms).toBeLessThan(200);
  });

  it('refuse un titre de 100 000 caractères en moins de 200 ms', () => {
    const { ms, accepted } = elapsed(() =>
      ok(campaignCreateSchema, {
        organisation: uuid,
        slug: 'acme',
        titre: huge,
        langue: 'fr'
      })
    );
    expect(accepted).toBe(false);
    expect(ms).toBeLessThan(200);
  });
});

describe('memberInviteSchema', () => {
  const base = {
    organisation: uuid,
    slug: 'acme',
    email: 'Marie@Exemple.org',
    emailConfirmation: 'marie@exemple.org',
    role: 'consultant',
    langue: 'fr'
  };

  it('accepte deux adresses identiques à la casse près', () => {
    expect(memberInviteSchema.parse(base).email).toBe('marie@exemple.org');
  });

  it('borne l’adresse à 254 caractères, comme la base', () => {
    const address = (n: number) => `${'a'.repeat(n - 12)}@exemple.org`;
    const pair = (a: string) => ({ ...base, email: a, emailConfirmation: a });
    expect(ok(memberInviteSchema, pair(address(254)))).toBe(true);
    expect(ok(memberInviteSchema, pair(address(255)))).toBe(false);
  });

  it('refuse deux adresses différentes', () => {
    expect(
      ok(memberInviteSchema, {
        ...base,
        emailConfirmation: 'autre@exemple.org'
      })
    ).toBe(false);
  });

  it('refuse le rôle participant ou inconnu', () => {
    expect(ok(memberInviteSchema, { ...base, role: 'participant' })).toBe(
      false
    );
    expect(ok(memberInviteSchema, { ...base, role: 'admin' })).toBe(false);
    expect(ok(memberInviteSchema, { ...base, role: 'responsable' })).toBe(true);
  });
});
