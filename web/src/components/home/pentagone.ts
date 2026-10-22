// Géométrie partagée des pentagones (héros, pic, marque) : cinq axes, le
// premier vers le haut, dans l'ordre des domaines. Un ratio de 0 à 1 place un
// point du centre à l'extrémité de l'axe.

export const AXES = 5;

export const sommet = (
  index: number,
  ratio: number,
  centre: number,
  rayon: number
): [number, number] => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / AXES;
  return [
    centre + Math.cos(angle) * rayon * ratio,
    centre + Math.sin(angle) * rayon * ratio
  ];
};

export const polygone = (
  ratios: readonly number[],
  centre: number,
  rayon: number
): string =>
  ratios
    .map((ratio, index) =>
      sommet(index, ratio, centre, rayon)
        .map((v) => v.toFixed(2))
        .join(',')
    )
    .join(' ');

// Score de domaine (24 à 120) ramené à un ratio d'axe ; un plancher garde la
// forme lisible près du centre.
export const ratioDeScore = (score: number): number =>
  0.12 + (0.88 * (score - 24)) / 96;

export const adoucir = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
