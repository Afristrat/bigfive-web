export type Niveau = 'low' | 'neutral' | 'high';

// Même règle que @bigfive-org/score : moyenne des réponses (score divisé par le
// nombre de questions) comparée au milieu de l'échelle de 1 à 5.
export function niveauDeScore(score: number, questions: number): Niveau {
  const moyenne = score / questions;
  if (moyenne > 3) return 'high';
  if (moyenne < 3) return 'low';
  return 'neutral';
}
