import { CSSProperties, ReactElement } from 'react';

// Titre cinétique : chaque mot dans son masque. Le texte reste un seul titre
// pour les lecteurs d'écran ; sans animation, les mots sont simplement posés.
// Sans dépendance serveur : utilisable dans un composant client (404, erreur).
export function MotsCinetiques({
  texte,
  depart = 0
}: {
  texte: string;
  depart?: number; // rang du premier mot, pour enchaîner après un autre élément
}): ReactElement {
  const mots = texte.split(/\s+/).filter(Boolean);
  return (
    <>
      {mots.map((mot, i) => (
        <span key={`${mot}-${i}`}>
          <span className='mot'>
            <span style={{ ['--i' as string]: depart + i } as CSSProperties}>
              {mot}
            </span>
          </span>
          {i < mots.length - 1 ? ' ' : null}
        </span>
      ))}
    </>
  );
}
