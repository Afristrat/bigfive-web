import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Sceau, initiale } from '@/components/sceau';

describe('initiale', () => {
  it('prend le premier graphème, accent compris, en capitale', () => {
    expect(initiale('élodie', 'fr')).toBe('É');
    expect(initiale('  amine@exemple.ma', 'fr')).toBe('A');
    expect(initiale('مؤسسة', 'ar')).toBe('م');
  });

  it('un texte vide ne donne aucune lettre', () => {
    expect(initiale('   ', 'fr')).toBe('');
  });
});

describe('Sceau', () => {
  it('est décoratif et ne rend pas de texte vide', () => {
    const html = renderToStaticMarkup(createElement(Sceau, { lettre: '' }));
    expect(html).toMatch(/^<svg aria-hidden="true"/);
    expect(html).not.toContain('<text');
  });
});
