// Navigation au clavier d'une liste d'onglets (motif WAI-ARIA « tabs », activation
// automatique). Renvoie l'index à activer, ou undefined si la touche ne concerne
// pas la liste. En langue écrite de droite à gauche, les flèches sont inversées :
// la flèche gauche avance, la flèche droite recule.
export function nextTabIndex(
  current: number,
  key: string,
  count: number,
  rtl: boolean
): number | undefined {
  if (count <= 0) return undefined;
  const pas = rtl ? -1 : 1;
  switch (key) {
    case 'ArrowRight':
      return (current + pas + count) % count;
    case 'ArrowLeft':
      return (current - pas + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
