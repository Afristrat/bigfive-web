// Logique pure du questionnaire : raccourcis clavier et progression.
// Les flèches sont gérées nativement par le groupe de boutons radio.

export type KeyTarget = {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
};

const EDITABLE_TAGS = new Set(['TEXTAREA', 'SELECT']);
const NON_TEXT_INPUTS = new Set(['radio', 'checkbox', 'button', 'submit']);

/**
 * Score choisi par une touche chiffrée, ou null. La touche « n » désigne le
 * n-ième choix de l'échelle (1 à scores.length) ; tout le reste est ignoré :
 * autre touche, chiffre hors bornes, combinaison avec Ctrl, Alt ou Méta,
 * saisie dans un champ de texte. Un bouton radio focalisé ne bloque pas le
 * raccourci : le choix est identique à celui du clavier natif.
 */
export function scoreForKey(
  key: string,
  scores: readonly number[],
  target?: KeyTarget | null,
  modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {}
): number | null {
  if (modifiers.ctrlKey || modifiers.altKey || modifiers.metaKey) return null;
  if (!/^[1-9]$/.test(key)) return null;
  if (target?.isContentEditable) return null;
  const tag = target?.tagName?.toUpperCase();
  if (tag && EDITABLE_TAGS.has(tag)) return null;
  if (tag === 'INPUT' && !NON_TEXT_INPUTS.has(target?.type ?? 'text'))
    return null;
  return scores[Number(key) - 1] ?? null;
}

/** Part de la barre de progression, bornée à 0..100. */
export function progressPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (current / total) * 100));
}
