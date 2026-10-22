'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import styles from './result.module.css';

export type RailItem = { id: string; label: string };

interface ResultRailProps {
  label: string;
  items: readonly RailItem[];
}

// Rail de progression collant sous l'en-tête du site : des liens d'ancre vers
// chaque partie du résultat. Sans JavaScript, ce sont de simples liens ; avec,
// la partie lue est marquée (aria-current) d'un trait qui se trace. Le rail
// défile horizontalement s'il manque de place, sans élargir la page.
export function ResultRail({ label, items }: ResultRailProps) {
  // Première partie active par défaut : la page s'ouvre sur le profil.
  const [actif, setActif] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visibles = entries.filter((entry) => entry.isIntersecting);
        if (visibles.length > 0) setActif(visibles[0].target.id);
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={label}
      className='sticky top-16 z-10 mt-6 border-b border-trait bg-fond/[0.92] backdrop-blur-sm print:hidden'
    >
      <ul className='-mx-3 flex gap-1 overflow-x-auto [scrollbar-width:none]'>
        {items.map((item) => (
          <li key={item.id} className='flex-none'>
            <a
              href={`#${item.id}`}
              aria-current={actif === item.id ? 'true' : undefined}
              className={clsx(
                styles['rail-lien'],
                'flex min-h-12 items-center px-3 text-petit font-medium transition-colors duration-normale ease-tenga',
                actif === item.id
                  ? 'text-encre'
                  : 'text-texte-2 hover:text-encre'
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
