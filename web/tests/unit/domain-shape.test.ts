import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DomainShape,
  domainNumber,
  domainShapes,
  shapePath
} from '@/components/domain-shape';
import { domainCodes } from '@/lib/domain-labels';

// Sommets d'un tracé « M x,y L x,y … Z » (le cercle est testé à part).
const sommets = (d: string): number[][] =>
  [...d.matchAll(/[ML]([-\d.]+),([-\d.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2])
  ]);

describe('domainShapes', () => {
  it('attribue une forme différente à chacun des cinq domaines', () => {
    expect(domainShapes).toEqual({
      N: 'circle',
      E: 'square',
      O: 'triangle',
      A: 'diamond',
      C: 'hexagon'
    });
    expect(new Set(Object.values(domainShapes)).size).toBe(5);
  });

  it('numérote les domaines de 01 à 05 dans l’ordre N, E, O, A, C', () => {
    expect(domainCodes.map(domainNumber)).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05'
    ]);
  });
});

describe('shapePath', () => {
  it('reproduit les marqueurs de la maquette B2 (rayon 9)', () => {
    // Maquette : carré de 16 de côté, triangle de sommet à -9,6, losange et
    // hexagone centrés sur le point.
    const carre = sommets(shapePath('square', 374.62, 202.01, 9));
    expect(carre[0][0]).toBeCloseTo(366.62, 1);
    expect(carre[1][0]).toBeCloseTo(382.62, 1);
    expect(carre[0][1]).toBeCloseTo(194.01, 1);
    const triangle = sommets(shapePath('triangle', 341.27, 334.1, 9));
    expect(triangle[0][1]).toBeCloseTo(324.5, 0);
    expect(triangle[1][0]).toBeCloseTo(350.07, 0);
    const losange = sommets(shapePath('diamond', 211.96, 315.89, 9));
    expect(losange[0][1]).toBeCloseTo(305.49, 0);
    expect(losange[1][0]).toBeCloseTo(222.36, 0);
    const hexagone = sommets(shapePath('hexagon', 161.8, 200.85, 9));
    expect(hexagone).toHaveLength(6);
    expect(hexagone[0][0]).toBeCloseTo(171.02, 0);
  });

  it('compte le bon nombre de sommets et se ferme', () => {
    expect(sommets(shapePath('square', 0, 0, 5))).toHaveLength(4);
    expect(sommets(shapePath('triangle', 0, 0, 5))).toHaveLength(3);
    expect(sommets(shapePath('diamond', 0, 0, 5))).toHaveLength(4);
    expect(sommets(shapePath('hexagon', 0, 0, 5))).toHaveLength(6);
    for (const shape of Object.values(domainShapes)) {
      expect(shapePath(shape, 0, 0, 5).trim().endsWith('Z')).toBe(true);
    }
  });

  it('dessine le cercle par deux arcs de même rayon', () => {
    expect(shapePath('circle', 10, 20, 9)).toBe(
      'M1.00,20.00 a9.00,9.00 0 1,0 18.00,0 a9.00,9.00 0 1,0 -18.00,0 Z'
    );
  });
});

describe('DomainShape', () => {
  it('est décoratif : masqué des technologies d’assistance', () => {
    const html = renderToStaticMarkup(
      createElement(DomainShape, { domain: 'E', size: 30 })
    );
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).toContain('width="30"');
    expect(html).toContain('fill="currentColor"');
  });

  it('trace le cercle sans contour et les autres formes avec contour', () => {
    const cercle = renderToStaticMarkup(
      createElement(DomainShape, { domain: 'N' })
    );
    const hexagone = renderToStaticMarkup(
      createElement(DomainShape, { domain: 'C' })
    );
    expect(cercle).not.toContain('stroke=');
    expect(hexagone).toContain('stroke="currentColor"');
  });
});
