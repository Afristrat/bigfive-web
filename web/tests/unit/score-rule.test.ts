import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  MILIEU_DE_REGLE,
  ScoreRule,
  partDeRegle
} from '@/components/score-rule';

type Props = Parameters<typeof ScoreRule>[0];

const rendre = (props: Partial<Props> = {}) =>
  renderToStaticMarkup(
    createElement(ScoreRule, {
      label: 'Extraversion',
      score: 82,
      min: 24,
      max: 120,
      valeur: '82',
      surMax: 'sur 120',
      niveau: 'élevé',
      ...props
    })
  );

const largeurDuTrait = (html: string) =>
  html.match(/regle-trait[^>]*style="width:([\d.]+)%/)?.[1];

describe('partDeRegle', () => {
  it('place le score sur l’échelle d’un domaine (24 à 120)', () => {
    expect(partDeRegle(24, 24, 120)).toBe(0);
    expect(partDeRegle(72, 24, 120)).toBe(0.5);
    expect(partDeRegle(120, 24, 120)).toBe(1);
    expect(partDeRegle(82, 24, 120)).toBeCloseTo(58 / 96);
  });

  it('place le score sur l’échelle d’une facette (4 à 20)', () => {
    expect(partDeRegle(4, 4, 20)).toBe(0);
    expect(partDeRegle(12, 4, 20)).toBe(0.5);
    expect(partDeRegle(20, 4, 20)).toBe(1);
  });

  it('borne les valeurs hors échelle et les échelles invalides', () => {
    expect(partDeRegle(0, 24, 120)).toBe(0);
    expect(partDeRegle(500, 24, 120)).toBe(1);
    expect(partDeRegle(50, 120, 120)).toBe(0);
    expect(partDeRegle(50, 120, 24)).toBe(0);
    expect(partDeRegle(Number.NaN, 24, 120)).toBe(0);
  });

  it('situe le repère du milieu à la réponse moyenne de 3 sur 5', () => {
    expect(partDeRegle(72, 24, 120)).toBe(MILIEU_DE_REGLE);
    expect(partDeRegle(12, 4, 20)).toBe(MILIEU_DE_REGLE);
  });
});

describe('ScoreRule', () => {
  it('trace le trait à la largeur de la part du score', () => {
    expect(largeurDuTrait(rendre({ score: 72 }))).toBe('50');
    expect(largeurDuTrait(rendre({ score: 24 }))).toBe('0');
    expect(largeurDuTrait(rendre({ score: 120 }))).toBe('100');
    expect(largeurDuTrait(rendre({ score: 200 }))).toBe('100');
  });

  it('s’inverse en arabe par des propriétés logiques, jamais physiques', () => {
    const html = rendre();
    expect(html).toContain('start-0');
    expect(html).toContain('origin-left');
    expect(html).toContain('rtl:origin-right');
    expect(html).toContain('inset-inline-start:50%');
    expect(html).not.toMatch(/(^|[\s"])(left|right)-/);
    expect(html).not.toMatch(/style="[^"]*(?<!inset-inline-)(left|right):/);
  });

  it('masque la piste et laisse le texte porter l’information', () => {
    const html = rendre();
    expect(html).toMatch(/<span aria-hidden="true" class="regle-piste/);
    const texte = html.replace(/<[^>]+>/g, '');
    expect(texte).toBe('Extraversion82 sur 120 élevé');
  });

  it('décale le tracé animé selon le rang et ne l’anime que sur demande', () => {
    expect(rendre()).not.toContain('animate-tracer');
    const anime = rendre({ anime: true, rang: 3 });
    expect(anime).toContain('animate-tracer');
    expect(anime).toContain('animation-delay:120ms');
  });

  it('rend un lien d’ancre seulement si une cible est fournie', () => {
    expect(rendre()).not.toContain('<a ');
    expect(rendre({ href: '#domaine-E' })).toContain('href="#domaine-E"');
  });

  it('adapte la hauteur de la piste à la taille', () => {
    expect(rendre()).toMatch(/regle-piste[^"]*h-2/);
    expect(rendre({ taille: 'facette', min: 4, max: 20, score: 12 })).toMatch(
      /regle-piste[^"]*h-1\.5/
    );
  });
});
