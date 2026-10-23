'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { valeurMontee } from '@/lib/count-up';
import { formatNombre } from '@/lib/format';
import styles from './result-motion.module.css';

interface ResultMotionProps {
  locale: string;
  children: ReactNode;
}

const DUREE_COMPTEUR = 700;

// Chef d'orchestre du mouvement de la page de résultat, sans aucun effet sur
// le contenu servi : la page est complète et lisible sans JavaScript.
// - [data-revele] : sous la ligne de flottaison au chargement, le bloc reçoit
//   la classe d'attente, puis se révèle par un masque à son entrée dans
//   l'écran. Ce qui est déjà visible n'est jamais masqué.
// - [data-compte] : la valeur affichée monte de 0 à sa cible quand elle entre
//   dans l'écran, une seule fois. Une boucle d'animation ne tourne que pendant
//   une montée et s'arrête dès que toutes sont finies.
// Sous prefers-reduced-motion, rien de tout cela n'est appliqué.
export function ResultMotion({ locale, children }: ResultMotionProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof IntersectionObserver === 'undefined') return;

    // Révélations.
    const pliure = window.innerHeight;
    const blocs = Array.from(
      element.querySelectorAll<HTMLElement>('[data-revele]')
    ).filter((bloc) => bloc.getBoundingClientRect().top > pliure * 0.92);
    const revele = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const bloc = entry.target as HTMLElement;
          bloc.classList.add(styles.vu);
          bloc.classList.remove(styles.attente);
          revele.unobserve(bloc);
        }
      },
      { rootMargin: '0px 0px -12% 0px' }
    );
    for (const bloc of blocs) {
      bloc.classList.add(styles.attente);
      revele.observe(bloc);
    }

    // Compteurs : une seule boucle pour toutes les montées en cours.
    // On écrit dans le nœud texte existant, que React garde en référence,
    // plutôt que de remplacer le contenu de l'élément.
    const ecrire = (noeud: HTMLElement, valeur: number) => {
      const texte = noeud.firstChild;
      if (texte && texte.nodeType === Node.TEXT_NODE) {
        texte.nodeValue = formatNombre(valeur, locale);
      }
    };
    const enCours = new Map<HTMLElement, { cible: number; debut: number }>();
    let trame = 0;
    const avancer = (maintenant: number) => {
      for (const [noeud, montee] of enCours) {
        const ecoule = maintenant - montee.debut;
        ecrire(noeud, valeurMontee(montee.cible, ecoule, DUREE_COMPTEUR));
        if (ecoule >= DUREE_COMPTEUR) enCours.delete(noeud);
      }
      trame = enCours.size > 0 ? requestAnimationFrame(avancer) : 0;
    };
    const compte = new IntersectionObserver(
      (entries) => {
        const maintenant = performance.now();
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const noeud = entry.target as HTMLElement;
          const cible = Number(noeud.dataset.compte);
          compte.unobserve(noeud);
          if (!Number.isFinite(cible)) continue;
          ecrire(noeud, 0);
          enCours.set(noeud, { cible, debut: maintenant });
        }
        if (enCours.size > 0 && trame === 0) {
          trame = requestAnimationFrame(avancer);
        }
      },
      { threshold: 0.6 }
    );
    const compteurs = Array.from(
      element.querySelectorAll<HTMLElement>('[data-compte]')
    );
    for (const noeud of compteurs) compte.observe(noeud);

    return () => {
      revele.disconnect();
      compte.disconnect();
      if (trame) cancelAnimationFrame(trame);
      // Tout revient à l'état final si le composant est démonté en cours.
      for (const bloc of blocs) bloc.classList.remove(styles.attente);
      for (const noeud of compteurs) {
        const cible = Number(noeud.dataset.compte);
        if (Number.isFinite(cible)) ecrire(noeud, cible);
      }
    };
  }, [locale]);

  return (
    <div ref={root} className='w-full'>
      {children}
    </div>
  );
}
