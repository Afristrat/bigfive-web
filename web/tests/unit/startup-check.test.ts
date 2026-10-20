import { describe, expect, it } from 'vitest';
import {
  assertStartup,
  isMailSinkActive,
  isMailSinkAllowed,
  startupProblems
} from '@/lib/startup-check';

const TOKEN = 't'.repeat(32);
const production = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  SITE_URL: 'https://tenga.example',
  RESEND_API_KEY: 'cle'
};
const preproduction = {
  ...production,
  APP_ENV: 'preproduction',
  MAIL_SINK: 'true',
  MAIL_SINK_TOKEN: TOKEN
};

describe('startupProblems', () => {
  it('accepte une production complète', () => {
    expect(startupProblems(production)).toEqual([]);
  });

  it('accepte une préproduction avec réceptacle, sans clé Resend', () => {
    expect(
      startupProblems({ ...preproduction, RESEND_API_KEY: undefined })
    ).toEqual([]);
  });

  it('REFUSE le réceptacle d’e-mails en production', () => {
    const problems = startupProblems({ ...production, MAIL_SINK: 'true' });
    expect(problems.join(' ')).toContain(
      'MAIL_SINK est actif hors préproduction'
    );
  });

  it('refuse le réceptacle quand APP_ENV est absent ou inconnu (échec fermé)', () => {
    for (const APP_ENV of [undefined, '', 'staging', 'Production']) {
      const problems = startupProblems({
        ...preproduction,
        APP_ENV
      });
      expect(problems.join(' ')).toContain('hors préproduction');
    }
  });

  it('refuse le réceptacle sans jeton de lecture assez long', () => {
    expect(
      startupProblems({ ...preproduction, MAIL_SINK_TOKEN: 'court' }).join(' ')
    ).toContain('MAIL_SINK_TOKEN');
  });

  it('refuse une valeur ambiguë de MAIL_SINK', () => {
    expect(
      startupProblems({ ...production, MAIL_SINK: 'oui' }).join(' ')
    ).toContain('MAIL_SINK doit valoir');
  });

  it('exige APP_ENV, SITE_URL en https et la clé Resend en production', () => {
    const joined = startupProblems({ NODE_ENV: 'production' }).join(' ');
    expect(joined).toContain('APP_ENV');
    expect(joined).toContain('SITE_URL');
    expect(joined).toContain('RESEND_API_KEY');
    expect(
      startupProblems({ ...production, SITE_URL: 'http://tenga.example' }).join(
        ' '
      )
    ).toContain('SITE_URL');
  });

  it('n’exige rien de tout cela hors production (tests)', () => {
    expect(startupProblems({ NODE_ENV: 'test' })).toEqual([]);
  });

  it('ajoute les problèmes des autres modules, sans citer de valeur', () => {
    const problems = startupProblems(production, ['SUPABASE_URL est absente.']);
    expect(problems).toEqual(['SUPABASE_URL est absente.']);
    expect(
      startupProblems({ ...production, MAIL_SINK: 'true' }).join(' ')
    ).not.toContain('cle');
  });
});

describe('assertStartup', () => {
  it('ne lève pas si tout va bien', () => {
    expect(() => assertStartup(production)).not.toThrow();
  });

  it('lève avec la liste des problèmes', () => {
    expect(() => assertStartup({ ...production, MAIL_SINK: 'true' })).toThrow(
      /Configuration refusée au démarrage/
    );
  });
});

describe('isMailSinkActive / isMailSinkAllowed', () => {
  it('n’est actif que pour la valeur exacte « true »', () => {
    expect(isMailSinkActive({ MAIL_SINK: 'true' })).toBe(true);
    for (const value of [undefined, '', 'false', 'TRUE', '1']) {
      expect(isMailSinkActive({ MAIL_SINK: value })).toBe(false);
    }
  });

  it('n’est permis qu’en préproduction déclarée', () => {
    expect(
      isMailSinkAllowed({ MAIL_SINK: 'true', APP_ENV: 'preproduction' })
    ).toBe(true);
    expect(
      isMailSinkAllowed({ MAIL_SINK: 'true', APP_ENV: 'production' })
    ).toBe(false);
    expect(isMailSinkAllowed({ MAIL_SINK: 'true' })).toBe(false);
    expect(isMailSinkAllowed({ APP_ENV: 'preproduction' })).toBe(false);
  });
});
