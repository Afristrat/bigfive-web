import { afterEach, describe, expect, it, vi } from 'vitest';

const startTransition = vi.hoisted(() =>
  vi.fn((callback: () => void) => callback())
);
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  startTransition
}));

import { transitionSubmit } from '@/components/transition-submit';

afterEach(() => vi.clearAllMocks());

// Aucun DOM dans le projet : `FormData` n'accepte pas un faux formulaire, on
// le remplace par une classe qui garde le formulaire reçu.
class FakeFormData {
  constructor(public readonly source: unknown) {}
}

const event = () => ({
  preventDefault: vi.fn(),
  currentTarget: { id: 'formulaire' } as unknown as HTMLFormElement
});

describe('transitionSubmit (envoi sans la prop action : aucun reset natif)', () => {
  it('annule l’envoi natif et lance l’action, dans une transition, avec les données du formulaire', () => {
    vi.stubGlobal('FormData', FakeFormData);
    const run = vi.fn();
    const e = event();
    transitionSubmit(false, run)(e);
    vi.unstubAllGlobals();
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(startTransition).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    const data: unknown = run.mock.calls[0]?.[0];
    expect(data).toBeInstanceOf(FakeFormData);
    expect((data as FakeFormData).source).toBe(e.currentTarget);
  });

  it('utilise le lecteur de données fourni quand il y en a un', () => {
    const run = vi.fn();
    const data = new FormData();
    data.set('email', 'a@b.test');
    const e = event();
    transitionSubmit(false, run, () => data)(e);
    expect(run).toHaveBeenCalledWith(data);
  });

  it('pendant un envoi : soumission annulée, ni transition ni action', () => {
    const run = vi.fn();
    const toData = vi.fn(() => new FormData());
    const e = event();
    transitionSubmit(true, run, toData)(e);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(startTransition).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(toData).not.toHaveBeenCalled();
  });
});
