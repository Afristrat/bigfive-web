import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  RadarChart,
  radarFraction,
  radarGeometry
} from '@/components/radar-chart';
import { domainCodes, domainLabel } from '@/lib/domain-labels';

const valeurs = [62, 88, 97, 79, 91];

const sommets = (chaine: string): number[][] =>
  chaine.split(' ').map((p) => p.split(',').map(Number));

const rendre = (locale: string) =>
  renderToStaticMarkup(
    createElement(RadarChart, {
      domains: domainCodes.map((code, i) => ({
        code,
        label: domainLabel(code, locale, 'short'),
        value: valeurs[i]
      })),
      min: 24,
      max: 120,
      locale,
      title: 'Radar des cinq grands facteurs',
      summary: 'Graphique en radar à cinq axes, de 24 à 120.',
      columnLabels: { domain: 'Domaine', score: 'Score' }
    })
  );

// Abscisses de bout d'axe de la première variante, dans l'ordre N, E, O, A, C.
const boutsDAxe = (html: string): number[] =>
  [
    ...html.matchAll(
      /<line class="radar-axe" x1="[\d.]+" y1="[\d.]+" x2="([\d.]+)"/g
    )
  ]
    .slice(0, 5)
    .map((m) => Number(m[1]));

describe('radarFraction', () => {
  it('place la valeur entre le centre (min) et le sommet (max)', () => {
    expect(radarFraction(24, 24, 120)).toBe(0);
    expect(radarFraction(72, 24, 120)).toBe(0.5);
    expect(radarFraction(120, 24, 120)).toBe(1);
  });

  it('borne les valeurs hors échelle et les échelles invalides', () => {
    expect(radarFraction(0, 24, 120)).toBe(0);
    expect(radarFraction(500, 24, 120)).toBe(1);
    expect(radarFraction(Number.NaN, 24, 120)).toBe(0);
    expect(radarFraction(50, 120, 24)).toBe(0);
  });
});

describe('radarGeometry', () => {
  it('place les bouts d’axe comme la maquette B2 (variante large)', () => {
    const g = radarGeometry(valeurs, 24, 120, false, 'large');
    expect(g.axes[0]).toEqual({ x1: 270, y1: 236, x2: 270, y2: 86 });
    expect(g.axes[1].x2).toBeCloseTo(412.7, 1);
    expect(g.axes[1].y2).toBeCloseTo(189.6, 1);
    expect(g.axes[2].x2).toBeCloseTo(358.2, 1);
    expect(g.axes[2].y2).toBeCloseTo(357.4, 1);
    expect(g.axes[3].x2).toBeCloseTo(181.8, 1);
    expect(g.axes[4].x2).toBeCloseTo(127.3, 1);
  });

  it('place chaque point à sa part de l’échelle sur son axe', () => {
    const g = radarGeometry([24, 120, 72, 120, 24], 24, 120, false, 'large');
    expect(g.points[0]).toEqual({ x: 270, y: 236 });
    expect(g.points[1].x).toBeCloseTo(g.axes[1].x2, 5);
    expect(g.points[1].y).toBeCloseTo(g.axes[1].y2, 5);
    // Moitié de l'échelle : à mi-chemin entre le centre et le bout de l'axe.
    expect(g.points[2].x).toBeCloseTo((270 + g.axes[2].x2) / 2, 5);
    expect(g.points[2].y).toBeCloseTo((236 + g.axes[2].y2) / 2, 5);
    expect(g.polygon.split(' ')).toHaveLength(5);
  });

  it('ramène les valeurs hors bornes sur le centre ou sur le sommet', () => {
    const g = radarGeometry([-10, 999, 24, 120, 72], 24, 120, false, 'compact');
    expect(g.points[0]).toEqual({ x: 210, y: 214 });
    expect(g.points[1].x).toBeCloseTo(g.axes[1].x2, 5);
    expect(g.points[1].y).toBeCloseTo(g.axes[1].y2, 5);
  });

  it('trace quatre anneaux à 25, 50, 75 et 100 % de l’échelle', () => {
    const g = radarGeometry(valeurs, 24, 120, false, 'large');
    expect(g.rings).toHaveLength(4);
    const sommetsHauts = g.rings.map((r) => sommets(r)[0][1]);
    expect(sommetsHauts[0]).toBeCloseTo(236 - 37.5, 1);
    expect(sommetsHauts[3]).toBeCloseTo(86, 1);
  });

  it('dessine en miroir en langue de droite à gauche', () => {
    const ltr = radarGeometry(valeurs, 24, 120, false, 'large');
    const rtl = radarGeometry(valeurs, 24, 120, true, 'large');
    ltr.axes.forEach((axe, i) => {
      expect(rtl.axes[i].x2).toBeCloseTo(540 - axe.x2, 5);
      expect(rtl.axes[i].y2).toBeCloseTo(axe.y2, 5);
    });
    ltr.points.forEach((point, i) => {
      expect(rtl.points[i].x).toBeCloseTo(540 - point.x, 5);
      expect(rtl.points[i].y).toBeCloseTo(point.y, 5);
    });
    ltr.labels.forEach((label, i) => {
      expect(rtl.labels[i].x).toBeCloseTo(540 - label.x, 5);
      expect(rtl.labels[i].nameY).toBeCloseTo(label.nameY, 5);
    });
    expect(ltr.labels.map((l) => l.anchor)).toEqual([
      'middle',
      'start',
      'start',
      'end',
      'end'
    ]);
    expect(rtl.labels.map((l) => l.anchor)).toEqual([
      'middle',
      'end',
      'end',
      'start',
      'start'
    ]);
  });

  it('refuse un nombre de valeurs différent de cinq', () => {
    expect(() => radarGeometry([1, 2, 3], 24, 120, false, 'large')).toThrow(
      RangeError
    );
  });
});

describe('RadarChart', () => {
  it('rend deux variantes et un tableau masqué comme alternative textuelle', () => {
    const html = rendre('fr');
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html.match(/role="img"/g)).toHaveLength(2);
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('<title');
    expect(html).toContain('<desc');
    expect(html).toContain('<table class="sr-only">');
    expect(html).toContain('<th scope="row">Névrosisme</th>');
    expect(html).toContain('<td dir="ltr">62 / 120</td>');
  });

  it('écrit le libellé complet et la valeur de chaque axe', () => {
    const html = rendre('fr');
    for (const libelle of [
      'Névrosisme',
      'Extraversion',
      'Ouverture',
      'Agréabilité',
      'Conscienciosité'
    ]) {
      expect(html).toContain(`>${libelle}</text>`);
    }
    expect(html).toContain('<tspan class="radar-valeur">97</tspan>');
    expect(html).toContain('Névrosisme : 62 / 120, Extraversion : 88 / 120');
  });

  it('place un marqueur par domaine avec un décalage croissant', () => {
    const html = rendre('fr');
    expect(html.match(/class="radar-marqueur"/g)).toHaveLength(10);
    expect(html).toContain('animation-delay:0.5s');
    expect(html).toContain('animation-delay:1.22s');
  });

  it('se retourne en arabe et garde des chiffres occidentaux', () => {
    const fr = boutsDAxe(rendre('fr'));
    const ar = boutsDAxe(rendre('ar'));
    // Axe de l'extraversion : à droite du centre en français, à gauche en arabe.
    expect(fr[1]).toBeGreaterThan(270);
    expect(ar[1]).toBeLessThan(270);
    ar.forEach((x, i) => expect(x).toBeCloseTo(540 - fr[i], 1));
    const html = rendre('ar');
    expect(html).toContain('>العُصابية</text>');
    expect(html).toContain('<td dir="ltr">62 / 120</td>');
  });
});
