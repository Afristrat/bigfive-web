import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import { ressembleCourriel } from '@/lib/helpers';

// Retrouver un résultat : la page publique n'accepte qu'un identifiant ou le
// lien de la page de résultat. Une adresse électronique reçoit un message qui
// renvoie vers « Mes résultats », jamais une recherche par adresse.
describe('ressembleCourriel', () => {
  it('reconnaît une adresse électronique, espaces autour compris', () => {
    expect(ressembleCourriel('medamine@gmail.com')).toBe(true);
    expect(ressembleCourriel('  a.b@exemple.ma ')).toBe(true);
  });

  it('ne confond ni un identifiant ni un lien de résultat avec une adresse', () => {
    expect(ressembleCourriel('58a70606a835c400c8b38e84')).toBe(false);
    expect(
      ressembleCourriel(
        'https://tenga.ai-mpower.com/fr/result/58a70606a835c400c8b38e84'
      )
    ).toBe(false);
    expect(ressembleCourriel('')).toBe(false);
  });
});

describe('textes de « Retrouver un résultat »', () => {
  const catalogues = { fr, en, ar } as const;

  it("le libellé du champ ne parle plus d'« adresse » ambiguë", () => {
    expect(fr.getResult.idInput).toBe(
      'Identifiant ou lien de la page de résultat'
    );
    expect(en.getResult.idInput).toBe('Result ID or result page link');
    expect(fr.getResult.idInput).not.toMatch(/adresse/i);
    expect(en.getResult.idInput).not.toMatch(/address/i);
  });

  it.each(Object.entries(catalogues))(
    '%s : message et lien pour une adresse électronique',
    (_langue, catalogue) => {
      expect(catalogue.getResult.courriel).toEqual(expect.any(String));
      expect(catalogue.getResult.courriel.length).toBeGreaterThan(20);
      expect(catalogue.getResult.courrielLien).toEqual(expect.any(String));
    }
  );
});

describe('ponctuation du message pour une adresse électronique', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/app/[locale]/result/get-result.tsx'),
    'utf8'
  );

  it('le point final suit le lien « Mes résultats », hors du lien', () => {
    expect(source).toMatch(/\{labels\.courrielLien\}\s*<\/Link>\s*\.\s*<\/>/);
  });

  it.each(Object.entries({ fr, en, ar }))(
    '%s : ni le texte ni le lien ne portent le point (il est rendu après le lien)',
    (_langue, catalogue) => {
      expect(catalogue.getResult.courriel).not.toMatch(/[.。]\s*$/);
      expect(catalogue.getResult.courrielLien).not.toMatch(/[.。]\s*$/);
    }
  );
});
