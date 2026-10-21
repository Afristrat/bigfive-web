import { describe, expect, it } from 'vitest';
import { parseInviteList } from '@/lib/invite-list';

describe('parseInviteList', () => {
  it('refuse une saisie vide ou blanche', () => {
    expect(parseInviteList('')).toMatchObject({ ok: false, reason: 'empty' });
    expect(parseInviteList(' \n \r\n ')).toMatchObject({
      ok: false,
      reason: 'empty'
    });
  });

  it('lit une adresse seule et une adresse avec prénom', () => {
    expect(parseInviteList('a@exemple.org\nb@exemple.org, Nadia')).toEqual({
      ok: true,
      invitees: [
        { email: 'a@exemple.org', prenom: null },
        { email: 'b@exemple.org', prenom: 'Nadia' }
      ],
      duplicates: 0
    });
  });

  it('accepte le point-virgule et les fins de ligne CRLF', () => {
    const out = parseInviteList('a@exemple.org; Yassine\r\nb@exemple.org\r\n');
    expect(out).toEqual({
      ok: true,
      invitees: [
        { email: 'a@exemple.org', prenom: 'Yassine' },
        { email: 'b@exemple.org', prenom: null }
      ],
      duplicates: 0
    });
  });

  it('met en minuscules, retire les blancs et dédoublonne', () => {
    const out = parseInviteList(' A@Exemple.ORG , Ali\na@exemple.org\n');
    expect(out).toEqual({
      ok: true,
      invitees: [{ email: 'a@exemple.org', prenom: 'Ali' }],
      duplicates: 1
    });
  });

  it('refuse plus de 25 adresses par défaut', () => {
    const many = Array.from({ length: 26 }, (_, i) => `u${i}@exemple.org`);
    expect(parseInviteList(many.join('\n'))).toMatchObject({
      ok: false,
      reason: 'too_many'
    });
    expect(parseInviteList(many.slice(0, 25).join('\n'))).toMatchObject({
      ok: true
    });
  });

  it('respecte un plafond passé en paramètre', () => {
    expect(parseInviteList('a@exemple.org\nb@exemple.org', 1)).toMatchObject({
      ok: false,
      reason: 'too_many'
    });
  });

  it('refuse tout le lot si une adresse est invalide, sans invité', () => {
    expect(
      parseInviteList('ok@exemple.org\nn importe quoi\nb@exemple.org')
    ).toEqual({
      ok: false,
      reason: 'address',
      rejected: ['n importe quoi']
    });
  });

  it('refuse a@b (pas de point dans le domaine)', () => {
    expect(parseInviteList('a@b')).toMatchObject({
      ok: false,
      reason: 'address',
      rejected: ['a@b']
    });
  });

  it('refuse une adresse de 255 caractères', () => {
    const address = `${'a'.repeat(243)}@exemple.org`;
    expect(address).toHaveLength(255);
    expect(parseInviteList(address)).toMatchObject({
      ok: false,
      reason: 'address'
    });
  });

  it('refuse un prénom de 81 caractères et accepte 80', () => {
    expect(parseInviteList(`a@exemple.org, ${'x'.repeat(81)}`)).toMatchObject({
      ok: false,
      reason: 'address'
    });
    expect(parseInviteList(`a@exemple.org, ${'x'.repeat(80)}`)).toMatchObject({
      ok: true
    });
  });

  it('refuse un prénom contenant un caractère de contrôle', () => {
    expect(parseInviteList('a@exemple.org, Na\u0007dia')).toMatchObject({
      ok: false,
      reason: 'address'
    });
  });

  it('traite un prénom vide après la virgule comme absent', () => {
    expect(parseInviteList('a@exemple.org,   ')).toEqual({
      ok: true,
      invitees: [{ email: 'a@exemple.org', prenom: null }],
      duplicates: 0
    });
  });

  it('refuse un prénom avec lien, domaine nu, arobase ou invisible, accepte J.-P.', () => {
    for (const name of [
      'evil.example/login',
      'exemple.ma',
      'a@b',
      'Na\u200Bdia',
      'www.x'
    ]) {
      expect(parseInviteList(`a@exemple.org, ${name}`)).toMatchObject({
        ok: false,
        reason: 'address'
      });
    }
    expect(parseInviteList('a@exemple.org, J.-P.')).toMatchObject({ ok: true });
  });
});
