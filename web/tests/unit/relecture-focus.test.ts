import { describe, expect, it } from 'vitest';
import { cibleApresVerdict, voisinDuBloc } from '@/lib/relecture-focus';

describe('voisinDuBloc', () => {
  const ordre = [
    'bloc-N1-bas-titre',
    'bloc-N1-haut-titre',
    'bloc-E3-bas-titre'
  ];

  it('le bloc suivant, sinon le précédent pour le dernier, sinon aucun', () => {
    expect(voisinDuBloc(ordre, 'bloc-N1-bas-titre')).toBe('bloc-N1-haut-titre');
    expect(voisinDuBloc(ordre, 'bloc-E3-bas-titre')).toBe('bloc-N1-haut-titre');
    expect(voisinDuBloc(['seul'], 'seul')).toBeNull();
    expect(voisinDuBloc(ordre, 'inconnu')).toBeNull();
  });
});

describe('cibleApresVerdict', () => {
  const base = {
    titreId: 'bloc-N1-bas-titre',
    suivantId: 'bloc-N1-haut-titre',
    repliId: 'selection-relecture',
    revalide: false
  };

  it('avant la revalidation, le bloc encore affiché : on attend, sans déplacer le focus', () => {
    expect(
      cibleApresVerdict({
        ...base,
        present: () => true,
        focusLibre: true
      })
    ).toBe('attendre');
  });

  it('revalidation observée et bloc toujours affiché : on s’arrête aussitôt, focus laissé en place', () => {
    expect(
      cibleApresVerdict({
        ...base,
        revalide: true,
        present: () => true,
        focusLibre: true
      })
    ).toBeNull();
  });

  it('revalidation observée et bloc sorti : titre du bloc suivant', () => {
    expect(
      cibleApresVerdict({
        ...base,
        revalide: true,
        present: (id) => id !== base.titreId,
        focusLibre: true
      })
    ).toBe('bloc-N1-haut-titre');
  });

  it('le bloc sort du filtre et le focus est perdu : titre du bloc suivant', () => {
    expect(
      cibleApresVerdict({
        ...base,
        present: (id) => id !== base.titreId,
        focusLibre: true
      })
    ).toBe('bloc-N1-haut-titre');
  });

  it('plus de bloc suivant : repli sur le décompte de la sélection', () => {
    expect(
      cibleApresVerdict({
        ...base,
        present: (id) => id === base.repliId,
        focusLibre: true
      })
    ).toBe('selection-relecture');
    expect(
      cibleApresVerdict({
        ...base,
        suivantId: null,
        present: (id) => id === base.repliId,
        focusLibre: true
      })
    ).toBe('selection-relecture');
  });

  it('la personne a déjà placé le focus ailleurs : on ne le reprend jamais', () => {
    expect(
      cibleApresVerdict({
        ...base,
        present: (id) => id !== base.titreId,
        focusLibre: false
      })
    ).toBeNull();
  });

  it('ni suivant ni repli dans la page : rien', () => {
    expect(
      cibleApresVerdict({ ...base, present: () => false, focusLibre: true })
    ).toBeNull();
  });
});
