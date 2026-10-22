'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Moteur de mouvement du site, sans dépendance : révélations au défilement
// ([data-reveal]), compteurs ([data-compteur]) et boutons aimantés
// ([data-aimant]). Seuls les éléments encore hors écran au montage reçoivent
// l'état de départ (data-pret) ; sous « réduire les animations », rien n'est
// préparé et tout reste à son état final.
export function MotionRuntime(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hauteur = window.innerHeight;

    const reveles = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-vu])')
    );
    const compteurs = Array.from(
      document.querySelectorAll<HTMLElement>('[data-compteur]:not([data-vu])')
    );
    // Lecture groupée des positions, puis écritures : aucun aller-retour de mise en page.
    const horsEcran = [...reveles, ...compteurs].filter(
      (el) => el.getBoundingClientRect().top > hauteur * 0.92
    );
    horsEcran.forEach((el) => {
      el.setAttribute('data-pret', '');
      if (el.dataset.compteur) el.textContent = '0';
    });

    const lancerCompteur = (el: HTMLElement): void => {
      const cible = Number(el.dataset.compteur);
      const format = new Intl.NumberFormat(
        `${el.dataset.locale ?? 'fr-MA'}-u-nu-latn`
      );
      const debut = performance.now();
      const duree = 1100;
      const pas = (t: number): void => {
        const k = Math.min(1, (t - debut) / duree);
        const e = 1 - Math.pow(1 - k, 4);
        el.textContent = format.format(Math.round(cible * e));
        if (k < 1) requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    };

    // Compteurs d'ouverture ([data-ouverture], en millisecondes) : visibles au
    // montage, ils partent de zéro quand leur bloc a fini d'apparaître.
    const minuteries: number[] = [];
    const ouverture = compteurs.filter(
      (el) => el.dataset.ouverture && !horsEcran.includes(el)
    );
    ouverture.forEach((el) => {
      el.textContent = '0';
      minuteries.push(
        window.setTimeout(
          () => lancerCompteur(el),
          Number(el.dataset.ouverture)
        )
      );
    });

    // Un élément entièrement rogné (masque, volet) n'intersecte jamais : on
    // observe alors son parent, qui porte la même position.
    const cibles = new Map<Element, HTMLElement[]>();
    horsEcran.forEach((el) => {
      const rogne = ['masque', 'volet'].includes(el.dataset.reveal ?? '');
      const cible = rogne && el.parentElement ? el.parentElement : el;
      cibles.set(cible, [...(cibles.get(cible) ?? []), el]);
    });
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue;
          observateur.unobserve(entree.target);
          for (const el of cibles.get(entree.target) ?? []) {
            const prepare = el.hasAttribute('data-pret');
            el.removeAttribute('data-pret');
            el.setAttribute('data-vu', '');
            if (prepare && el.dataset.compteur) lancerCompteur(el);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );
    cibles.forEach((_, cible) => observateur.observe(cible));

    // Boutons aimantés : un léger décalage vers le pointeur, pointeur fin seulement.
    const nettoyages: Array<() => void> = [];
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll<HTMLElement>('[data-aimant]').forEach((el) => {
        const bouger = (e: PointerEvent): void => {
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          el.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 8).toFixed(1)}px`;
        };
        const quitter = (): void => {
          el.style.translate = '';
        };
        el.addEventListener('pointermove', bouger);
        el.addEventListener('pointerleave', quitter);
        nettoyages.push(() => {
          el.removeEventListener('pointermove', bouger);
          el.removeEventListener('pointerleave', quitter);
        });
      });
    }

    return () => {
      observateur.disconnect();
      minuteries.forEach((id) => window.clearTimeout(id));
      // Un compteur interrompu retrouve sa valeur finale.
      ouverture.forEach((el) => {
        el.textContent = new Intl.NumberFormat(
          `${el.dataset.locale ?? 'fr-MA'}-u-nu-latn`
        ).format(Number(el.dataset.compteur));
      });
      nettoyages.forEach((n) => n());
      // Une navigation ne laisse jamais un contenu à l'état de départ.
      document
        .querySelectorAll('[data-pret]')
        .forEach((el) => el.removeAttribute('data-pret'));
    };
  }, [pathname]);

  return null;
}
