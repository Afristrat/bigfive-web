import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateHeure,
  formatNombre,
  isoler,
  localeRegionale
} from '@/lib/format';

describe('format', () => {
  it('associe chaque langue servie à sa variante régionale', () => {
    expect(localeRegionale('fr')).toBe('fr-MA');
    expect(localeRegionale('ar')).toBe('ar-MA');
    expect(localeRegionale('en')).toBe('en-GB');
    expect(localeRegionale('de')).toBe('de');
  });

  it('écrit la date en arabe avec des chiffres occidentaux', () => {
    const date = formatDate('2026-10-19', 'ar');
    expect(date).not.toMatch(/[٠-٩]/);
    expect(date).toMatch(/2026/);
  });

  it('écrit la date en français en toutes lettres', () => {
    expect(formatDate('2026-10-19', 'fr')).toBe('19 octobre 2026');
  });

  it('écrit les nombres arabes avec des chiffres occidentaux', () => {
    expect(formatNombre(120, 'ar')).toBe('120');
    expect(formatNombre(82, 'fr')).toBe('82');
  });

  it('accepte un horodatage numérique', () => {
    expect(formatDate(Date.UTC(2026, 9, 19, 12), 'fr')).toBe('19 octobre 2026');
  });

  it('lit la date au fuseau demandé, pas à celui du serveur', () => {
    const tard = Date.UTC(2026, 9, 19, 23, 30);
    expect(formatDate(tard, 'fr', 'UTC')).toBe('19 octobre 2026');
    expect(formatDate(tard, 'fr', 'Africa/Casablanca')).toBe('20 octobre 2026');
  });

  it('lit la date et l’heure au fuseau demandé, pas à celui du serveur', () => {
    const tard = Date.UTC(2026, 9, 19, 23, 30);
    expect(formatDateHeure(tard, 'fr', 'UTC')).toBe('19/10/2026 23:30');
    expect(formatDateHeure(tard, 'fr', 'Africa/Casablanca')).toBe(
      '20/10/2026 00:30'
    );
  });

  it('isole un segment latin par les marques FSI et PDI', () => {
    const isole = isoler('contact@tenga.ma');
    expect(isole.codePointAt(0)).toBe(0x2068);
    expect(isole.codePointAt(isole.length - 1)).toBe(0x2069);
    expect(isole.slice(1, -1)).toBe('contact@tenga.ma');
  });
});
