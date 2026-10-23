import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LiveMessage } from '@/components/live-message';
import { Notice } from '@/components/notice';
import { PendingButton } from '@/components/pending-button';

describe('LiveMessage', () => {
  it('le conteneur existe toujours, vide au départ (région vivante persistante)', () => {
    const html = renderToStaticMarkup(
      createElement(LiveMessage, { id: 'r', ton: 'info' }, null)
    );
    expect(html).toMatch(/^<div[^>]*role="status"/);
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('id="r"');
    expect(html).not.toContain('<p');
    expect(html).not.toContain('bg-');
  });

  it('le message est dans le conteneur, avec le ton demandé', () => {
    const html = renderToStaticMarkup(
      createElement(LiveMessage, { ton: 'erreur' }, 'Échec')
    );
    expect(html).toMatch(/^<div[^>]*role="status"/);
    expect(html).toContain('Échec');
    expect(html).toContain('bg-erreur-doux');
  });

  it('peut être réservé aux lecteurs d’écran', () => {
    const html = renderToStaticMarkup(
      createElement(LiveMessage, { ton: 'info', visuallyHidden: true }, 'Ok')
    );
    expect(html).toContain('sr-only');
  });
});

describe('PendingButton', () => {
  const render = (pending: boolean): string =>
    renderToStaticMarkup(
      createElement(PendingButton, { pending, label: 'Envoyer' })
    );

  it('en cours : aria-disabled, jamais disabled (le focus reste sur le bouton)', () => {
    const html = render(true);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(html).not.toContain('Loading');
    expect(html).not.toContain('<svg');
  });

  it('au repos : pas d’aria-disabled', () => {
    expect(render(false)).not.toContain('aria-disabled');
  });

  it('le trait d’attente n’existe que pendant l’envoi, caché aux lecteurs d’écran', () => {
    expect(render(true)).toMatch(/<span aria-hidden="true" data-attente=""/);
    expect(render(false)).not.toContain('data-attente');
  });
});

describe('Notice', () => {
  const render = (ton: 'info' | 'succes' | 'erreur'): string =>
    renderToStaticMarkup(createElement(Notice, { ton, children: 'Message' }));

  it('un succès porte une coche décorative, un refus est une alerte', () => {
    expect(render('succes')).toMatch(/role="status"/);
    expect(render('succes')).toMatch(/<svg aria-hidden="true"/);
    expect(render('info')).not.toContain('<svg');
    expect(render('erreur')).toMatch(/role="alert"/);
  });
});
