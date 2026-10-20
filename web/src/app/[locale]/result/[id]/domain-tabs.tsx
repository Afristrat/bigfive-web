'use client';

import clsx from 'clsx';
import { KeyboardEvent, ReactNode, useRef, useState } from 'react';
import { DomainShape } from '@/components/domain-shape';
import { DomainCode } from '@/lib/domain-labels';
import { nextTabIndex } from '@/lib/tabs';

export type DomainTabPanel = {
  code: DomainCode;
  label: string;
  content: ReactNode;
};

interface DomainTabsProps {
  label: string;
  rtl: boolean;
  panels: DomainTabPanel[];
}

// Onglets des cinq domaines (motif WAI-ARIA « tabs », activation automatique,
// flèches inversées en arabe). Tous les panneaux sont rendus dans la page : les
// panneaux inactifs sont masqués à l'écran mais s'impriment (print:block).
export function DomainTabs({ label, rtl, panels }: DomainTabsProps) {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    const next = nextTabIndex(index, event.key, panels.length, rtl);
    if (next === undefined) return;
    event.preventDefault();
    setSelected(next);
    refs.current[next]?.focus();
  };

  return (
    <>
      <div
        role='tablist'
        aria-label={label}
        className='my-6 flex flex-wrap gap-2.5 print:hidden'
      >
        {panels.map((panel, index) => {
          const active = index === selected;
          return (
            <button
              key={panel.code}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type='button'
              role='tab'
              id={'onglet-' + panel.code}
              aria-selected={active}
              aria-controls={'panneau-' + panel.code}
              tabIndex={active ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={clsx(
                'inline-flex min-h-12 items-center gap-2.5 rounded-full border-[1.5px] px-[18px] text-[15.5px] font-bold transition-colors duration-normale',
                active
                  ? 'border-accent bg-accent text-sur-accent'
                  : 'border-trait-fort bg-surface text-encre hover:bg-creux'
              )}
            >
              {active ? (
                <svg
                  viewBox='0 0 16 16'
                  width='16'
                  height='16'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.4'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'
                  focusable='false'
                  className='flex-none'
                >
                  <path d='M3 8.5l3.2 3.2L13 4.8' />
                </svg>
              ) : (
                <DomainShape domain={panel.code} size={16} />
              )}
              {panel.label}
            </button>
          );
        })}
      </div>
      {panels.map((panel, index) => (
        <div
          key={panel.code}
          role='tabpanel'
          id={'panneau-' + panel.code}
          aria-labelledby={'onglet-' + panel.code}
          hidden={index !== selected}
          tabIndex={0}
          className='break-inside-avoid-page print:mt-8 print:block'
        >
          {panel.content}
        </div>
      ))}
    </>
  );
}
