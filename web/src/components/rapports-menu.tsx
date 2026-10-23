'use client';

import { ReactElement, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  estPageCourante,
  type MenuRapports,
  type SectionRapports
} from '@/lib/rapports-menu';
import { Link as NextLink } from '../navigation';

/**
 * Lit le menu « Rapports » auprès du serveur, à chaque page : le rôle n'est
 * jamais déduit côté navigateur. Une réponse refusée, vide ou illisible laisse
 * le menu absent ; une page quittée avant la réponse l'abandonne.
 */
export function useMenuRapports(
  locale: string,
  pathname: string
): MenuRapports {
  const [sections, setSections] = useState<MenuRapports>([]);
  useEffect(() => {
    const abandon = new AbortController();
    fetch(`/api/rapports-menu?locale=${encodeURIComponent(locale)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: abandon.signal
    })
      .then((r) => (r.ok ? r.json() : { sections: [] }))
      .then((corps: { sections?: unknown }) => {
        // Réponse de notre propre route (même origine), bâtie par
        // construireMenuRapports : seule sa forme de tableau est revérifiée.
        setSections(
          Array.isArray(corps.sections) ? (corps.sections as MenuRapports) : []
        );
      })
      .catch(() => {
        if (!abandon.signal.aborted) setSections([]);
      });
    return () => abandon.abort();
  }, [locale, pathname]);
  return sections;
}

function Sections({
  sections,
  pathname,
  onChoisir
}: {
  sections: MenuRapports;
  pathname: string;
  onChoisir: () => void;
}): ReactElement {
  return (
    <>
      {sections.map((section: SectionRapports, rang) => (
        <div
          key={section.cle}
          role='group'
          aria-labelledby={`rapports-${section.cle}`}
          className={clsx('py-1.5', rang > 0 && 'border-t border-trait')}
        >
          <p
            id={`rapports-${section.cle}`}
            className='flex flex-wrap items-baseline justify-between gap-x-3 px-3.5 pb-1 pt-2 text-legende font-medium text-texte-3'
          >
            <bdi className='[overflow-wrap:anywhere]'>{section.titre}</bdi>
            {section.sousTitre && <span>{section.sousTitre}</span>}
          </p>
          <ul role='list'>
            {section.entrees.map((entree, i) => {
              const courant = estPageCourante(entree.href, pathname);
              return (
                <li key={`${entree.href}-${i}`}>
                  <NextLink
                    href={entree.href}
                    onClick={onChoisir}
                    aria-current={courant ? 'page' : undefined}
                    className={clsx(
                      'menu-entree relative flex min-h-11 flex-col justify-center rounded-controle px-3.5 py-2',
                      courant
                        ? 'bg-accent-doux text-encre after:absolute after:inset-y-2.5 after:start-0 after:w-0.5 after:bg-accent'
                        : 'text-encre hover:bg-creux'
                    )}
                    style={{ ['--i' as string]: Math.min(i, 8) }}
                  >
                    <bdi className='font-medium [overflow-wrap:anywhere]'>
                      {entree.libelle}
                    </bdi>
                    {entree.detail && (
                      <span className='text-legende text-texte-2'>
                        {entree.detail}
                      </span>
                    )}
                  </NextLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * Bouton « Rapports » de la barre (grand écran) : un panneau qui s'ouvre sous
 * lui, se referme sur Échap (le focus revient au bouton), au clic extérieur et
 * à chaque navigation. Rien n'est rendu tant que le serveur n'a pas répondu
 * avec au moins une section.
 */
export function RapportsBarre({
  sections,
  pathname,
  libelle
}: {
  sections: MenuRapports;
  pathname: string;
  libelle: string;
}): ReactElement | null {
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    setOuvert(false);
  }, [pathname]);
  useEffect(() => {
    if (!ouvert) return;
    const clavier = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      setOuvert(false);
      racine.current?.querySelector('summary')?.focus();
    };
    const pointeur = (event: PointerEvent): void => {
      if (!racine.current?.contains(event.target as Node)) setOuvert(false);
    };
    document.addEventListener('keydown', clavier);
    document.addEventListener('pointerdown', pointeur);
    return () => {
      document.removeEventListener('keydown', clavier);
      document.removeEventListener('pointerdown', pointeur);
    };
  }, [ouvert]);

  if (sections.length === 0) return null;
  const courant = sections.some((s) =>
    s.entrees.some((e) => estPageCourante(e.href, pathname))
  );

  return (
    <details
      ref={racine}
      className='relative ms-1 hidden animate-apparaitre min-[1240px]:block'
      open={ouvert}
      onToggle={(event) => setOuvert(event.currentTarget.open)}
    >
      <summary
        className={clsx(
          'filet inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 whitespace-nowrap rounded-petit px-3 text-[0.9375rem] font-medium transition-colors duration-courte ease-tenga [&::-webkit-details-marker]:hidden',
          courant ? 'text-encre' : 'text-texte-2 hover:text-encre'
        )}
        aria-current={courant ? 'true' : undefined}
      >
        {libelle}
        <svg
          aria-hidden='true'
          focusable='false'
          viewBox='0 0 16 16'
          width={14}
          height={14}
          fill='none'
          stroke='currentColor'
          strokeWidth={1.75}
          strokeLinecap='round'
          strokeLinejoin='round'
          className={clsx(
            'transition-transform duration-normale ease-tenga',
            ouvert && 'rotate-180'
          )}
        >
          <path d='M4 6l4 4 4-4' />
        </svg>
      </summary>
      <nav
        aria-label={libelle}
        className='menu-panneau absolute start-0 top-14 z-menu max-h-[min(70vh,560px)] w-[340px] origin-top-left overflow-y-auto overscroll-contain rounded-panneau border border-trait bg-surface p-2 shadow-flottant rtl:origin-top-right dark:shadow-flottant-sombre'
      >
        <Sections
          sections={sections}
          pathname={pathname}
          onChoisir={() => setOuvert(false)}
        />
      </nav>
    </details>
  );
}

/** Groupe « Rapports » du menu mobile, sous les liens du site. */
export function RapportsMenuMobile({
  sections,
  pathname,
  libelle,
  onChoisir
}: {
  sections: MenuRapports;
  pathname: string;
  libelle: string;
  onChoisir: () => void;
}): ReactElement | null {
  if (sections.length === 0) return null;
  return (
    <div className='mt-1 border-t-2 border-encre pt-2'>
      <p className='px-3.5 pb-1 pt-1 text-petit font-semibold text-encre'>
        {libelle}
      </p>
      <Sections sections={sections} pathname={pathname} onChoisir={onChoisir} />
    </div>
  );
}
