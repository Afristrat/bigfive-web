'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';

export type ResultNavItem = { code: string; label: string };

interface ResultNavProps {
  items: ResultNavItem[];
  label: string;
}

// Sommaire des domaines : colonne collante au-delà de 1 024 px, rangée de liens
// défilante en dessous. L'entrée lue est signalée par aria-current="location".
export function ResultNav({ items, label }: ResultNavProps) {
  const [active, setActive] = useState<string | undefined>(items[0]?.code);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[id^="domaine-"]')
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id.replace('domaine-', ''));
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <nav
        aria-label={label}
        className='hidden self-start print:hidden lg:sticky lg:top-24 lg:col-span-3 lg:block'
      >
        <p className='text-petit font-medium text-texte-3'>{label}</p>
        <ul className='mt-3 flex flex-col gap-2'>
          {items.map((item) => {
            const isActive = item.code === active;
            return (
              <li key={item.code}>
                <a
                  href={'#domaine-' + item.code}
                  aria-current={isActive ? 'location' : undefined}
                  className={clsx(
                    'block border-s-2 py-1 ps-3 text-petit transition-colors duration-courte',
                    isActive
                      ? 'border-accent font-medium text-encre'
                      : 'border-transparent text-texte-2 hover:text-encre'
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav
        aria-label={label}
        className='-mx-5 mb-8 overflow-x-auto px-5 print:hidden lg:hidden'
      >
        <ul className='flex gap-2'>
          {items.map((item) => (
            <li key={item.code}>
              <a
                href={'#domaine-' + item.code}
                aria-current={item.code === active ? 'location' : undefined}
                className={clsx(
                  'block whitespace-nowrap rounded-controle border px-3 py-2 text-petit transition-colors duration-courte',
                  item.code === active
                    ? 'border-accent bg-accent-doux text-encre'
                    : 'border-trait text-texte-2 hover:text-encre'
                )}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
