import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

const disallowed = (): string[] => {
  const rules = robots().rules;
  const first = Array.isArray(rules) ? rules[0] : rules;
  const list = first?.disallow;
  return Array.isArray(list) ? list : list ? [list] : [];
};

describe('robots.txt', () => {
  it('écarte les liens d’invitation et les pages d’organisation, avec et sans langue', () => {
    const list = disallowed();
    for (const path of ['/i/', '/*/i/', '/o/', '/*/o/']) {
      expect(list).toContain(path);
    }
  });

  it('garde les exclusions de l’espace privé', () => {
    const list = disallowed();
    for (const path of [
      '/admin',
      '/mon-compte',
      '/connexion',
      '/c/',
      '/api/'
    ]) {
      expect(list).toContain(path);
    }
  });
});
