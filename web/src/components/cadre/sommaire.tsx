'use client';

import { ReactElement, useEffect, useState } from 'react';

interface SommaireProps {
  label: string;
  items: { id: string; label: string }[];
}

// Sommaire d'une longue page : collant sous l'en-tête dès les grands écrans, il
// suit la lecture. La section qui traverse le tiers haut de l'écran porte
// aria-current="location" et le filet d'accent (classe filet, cadre.css) ; un
// seul rendu par changement de section, aucun par image.
export function Sommaire({ label, items }: SommaireProps): ReactElement {
  const [courant, setCourant] = useState<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    const visibles = new Set<string>();
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) visibles.add(entree.target.id);
          else visibles.delete(entree.target.id);
        }
        // La première section dans l'ordre de la page parmi celles en vue.
        setCourant(items.find((item) => visibles.has(item.id))?.id ?? null);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach((section) => observateur.observe(section));
    return () => observateur.disconnect();
  }, [items]);

  return (
    <nav
      aria-label={label}
      className='sommaire-collant z-[5] mt-8 border-y border-trait lg:sticky lg:top-16'
    >
      <ul role='list' className='-mx-3 flex flex-wrap gap-x-2'>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={courant === item.id ? 'location' : undefined}
              className='filet inline-flex min-h-11 items-center px-3 text-petit font-medium text-texte-2 transition-colors duration-courte ease-tenga hover:text-encre aria-[current=location]:text-encre'
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
