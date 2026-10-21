import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pas de DOM dans le projet : l'état de l'annonceur est piloté à la main.
type Announcement = { text: string; ton: string; serial: number } | null;
let current: Announcement = null;
const setter = vi.fn();
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) =>
      initial === null ? [current, setter] : actual.useState(initial)
  };
});

import {
  CampaignAnnouncer,
  useAnnounce
} from '@/components/campaign-announcer';

beforeEach(() => {
  current = null;
  setter.mockReset();
});

describe('CampaignAnnouncer', () => {
  it('la région existe, vide, avant toute annonce', () => {
    const html = renderToStaticMarkup(
      createElement(CampaignAnnouncer, null, createElement('p', null, 'liste'))
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('liste');
  });

  it('une annonce est rendue dans la région', () => {
    current = { text: 'Campagne ouverte.', ton: 'info', serial: 1 };
    const html = renderToStaticMarkup(
      createElement(CampaignAnnouncer, null, null)
    );
    expect(html).toContain('Campagne ouverte.');
  });

  it('le numéro de série augmente à chaque annonce (un refus identique est relu)', () => {
    let announce: ReturnType<typeof useAnnounce> | undefined;
    function Capture() {
      announce = useAnnounce();
      return null;
    }
    renderToStaticMarkup(
      createElement(CampaignAnnouncer, null, createElement(Capture))
    );
    announce?.('Refus', 'erreur');
    const update = setter.mock.calls[0]?.[0] as (
      previous: Announcement
    ) => Announcement;
    const first = update(null);
    const second = update(first);
    expect(first).toEqual({ text: 'Refus', ton: 'erreur', serial: 1 });
    expect(second?.serial).toBe(2);
  });

  it('useAnnounce hors de l’annonceur lève une erreur au lieu de se taire', () => {
    function Orphan() {
      useAnnounce();
      return null;
    }
    expect(() => renderToStaticMarkup(createElement(Orphan))).toThrow(
      /CampaignAnnouncer/
    );
  });
});
