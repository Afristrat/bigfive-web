import { describe, expect, it } from 'vitest';
import { getItems } from '@bigfive-org/questions';
import { getLocalizedItems } from '@/lib/question-overrides';

const byId = <T extends { id: string }>(items: T[]) =>
  new Map(items.map((item) => [item.id, item]));

describe('getLocalizedItems', () => {
  it('ne modifie que le texte de quelques questions en français', () => {
    const base = getItems('fr');
    const localized = getLocalizedItems('fr');
    expect(localized).toHaveLength(base.length);

    const baseById = byId(base);
    const changed = localized.filter(
      (item) => item.text !== baseById.get(item.id)?.text
    );
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.length).toBeLessThan(base.length);

    // Le calcul des scores dépend du domaine, de la facette et du sens de
    // cotation : ils doivent rester ceux de la question d'origine.
    for (const item of localized) {
      const original = baseById.get(item.id);
      expect(original).toBeDefined();
      expect(item.domain).toBe(original?.domain);
      expect(item.facet).toBe(original?.facet);
      expect(item.num).toBe(original?.num);
      expect(item.keyed).toBe(original?.keyed);
    }
  });

  it('applique des textes en arabe sur un sous-ensemble de questions', () => {
    const base = byId(getItems('ar'));
    const changed = getLocalizedItems('ar').filter(
      (item) => item.text !== base.get(item.id)?.text
    );
    expect(changed.length).toBeGreaterThan(0);
  });

  it('corrige « Plutot » en « Plutôt » sans toucher aux scores', () => {
    const base = byId(getItems('fr'));
    const localized = getLocalizedItems('fr');
    const texts = localized.flatMap((item) => item.choices.map((c) => c.text));
    expect(texts.some((text) => text.includes('Plutot'))).toBe(false);
    expect(texts.some((text) => text.includes('Plutôt'))).toBe(true);
    for (const item of localized) {
      const original = base.get(item.id);
      expect(item.choices.map((c) => c.score)).toEqual(
        original?.choices.map((c) => c.score)
      );
    }
  });

  it('laisse les autres langues strictement inchangées', () => {
    expect(getLocalizedItems('en')).toEqual(getItems('en'));
    expect(getLocalizedItems('de')).toEqual(getItems('de'));
  });
});
