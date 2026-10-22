import { describe, expect, it } from 'vitest';
import { passwordProblem } from '@/lib/password-policy';

const EMAIL = 'medamine@example.test';

describe('passwordProblem', () => {
  it('refuse moins de 12 caractères', () => {
    expect(passwordProblem('Court1!', EMAIL)).toBe('too_short');
    expect(passwordProblem('a'.repeat(11), EMAIL)).toBe('too_short');
  });

  it('compte les caractères, pas les octets, pour la longueur minimale', () => {
    // 12 caractères dont des accents : accepté (rien d'autre à redire).
    expect(passwordProblem('éèàçùôîêâûï1', EMAIL)).toBeNull();
  });

  it('refuse plus de 72 octets (limite de bcrypt)', () => {
    expect(passwordProblem('x7Qm'.repeat(19), EMAIL)).toBe('too_long');
    expect(passwordProblem('x7Qm'.repeat(18), EMAIL)).toBeNull();
  });

  it('refuse un caractère répété', () => {
    expect(passwordProblem('a'.repeat(14), EMAIL)).toBe('repetitive');
  });

  it('refuse un mot de passe de la liste des mots de passe courants', () => {
    expect(passwordProblem('iloveyou1234', EMAIL)).toBe('common');
    expect(passwordProblem('ILOVEYOU1234', EMAIL)).toBe('common');
  });

  it('refuse une variante de la liste qui ne diffère que par la ponctuation', () => {
    expect(passwordProblem('i-love-you-1234', EMAIL)).toBe('common');
  });

  it("refuse un mot de passe qui contient l'adresse ou son début", () => {
    expect(passwordProblem('xx-medamine-xx-91', EMAIL)).toBe('contains_email');
    expect(passwordProblem('zz medamine@example.test zz', EMAIL)).toBe(
      'contains_email'
    );
  });

  it('accepte une longue phrase sans règle de composition', () => {
    expect(passwordProblem('cheval vapeur bleu ocre', EMAIL)).toBeNull();
    expect(passwordProblem('z7qmw8kdp3xt', EMAIL)).toBeNull();
  });
});
