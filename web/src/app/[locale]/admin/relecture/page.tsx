import clsx from 'clsx';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import { title } from '@/components/primitives';
import { AnnoncesRelecture } from '@/components/relecture/annonces-relecture';
import {
  BlocCarte,
  type BlocCarteLabels,
  type HistoriqueLigne
} from '@/components/relecture/bloc-carte';
import { RelecteursPanel } from '@/components/relecture/relecteurs-panel';
import { nomProfilApercu } from '@/lib/apercu-resultats';
import { blocsBibliotheque } from '@/lib/bibliotheque';
import { domainLabel, facetLabel } from '@/lib/domain-labels';
import {
  FUSEAU_MAROC,
  formatDate,
  formatDateHeure,
  formatNombre,
  isolerEnArabe
} from '@/lib/format';
import {
  assemblerAtelier,
  CONSERVATION_RELECTURE_JOURS,
  compterStatuts,
  lienAtelier,
  lireFiltresAtelier,
  selectionner,
  STATUTS_ATELIER,
  TRIS_ATELIER,
  type BlocAtelier,
  type FiltreStatut
} from '@/lib/relecture-atelier';
import {
  estAdministrateur,
  loadEtat,
  loadFrequences,
  loadHistorique,
  loadRelecteurs,
  requireRelecteur
} from '@/lib/relecture-data';
import { REPLI_FOCUS_ID } from '@/lib/relecture-focus';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const CHEMIN = '/admin/relecture';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'relecture' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

const segment = (actif: boolean): string =>
  clsx(
    'appui inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-petit font-medium transition-colors duration-courte ease-tenga motion-reduce:transition-none',
    actif
      ? 'border-encre bg-encre text-fond'
      : 'border-trait text-encre hover:border-encre'
  );

// Atelier de relecture : une thèse en titre, montée mot à mot ; l'avancement
// en grand, posé sur un filet d'encre ; la sélection (statut, ordre) en
// segments ; puis chaque bloc en registre (contexte en marge, texte en colonne
// de lecture), révélé au défilement ; enfin, pour les super administrateurs,
// les relecteurs désignés. Le statut de chaque bloc vient de l'état servi ;
// l'historique montré est celui que la base filtre pour la personne (complet
// pour un super administrateur, ses seuls verdicts pour un relecteur désigné).
export default async function RelecturePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est ni super administrateur ni relecteur désigné (lu en base).
  const viewer = await requireRelecteur(locale, CHEMIN);
  const [historique, etat, frequences, admin] = await Promise.all([
    loadHistorique(viewer),
    loadEtat(),
    loadFrequences(viewer),
    estAdministrateur(viewer)
  ]);
  const relecteurs = admin ? await loadRelecteurs(viewer) : null;
  const filtres = lireFiltresAtelier(await searchParams);

  const t = await getTranslations('relecture');
  const niv = await getTranslations('niveaux');
  const mes = await getTranslations('mesResultats');

  const blocs = blocsBibliotheque();
  const disponible = historique !== null && etat !== null;
  const atelier =
    historique !== null && etat !== null
      ? assemblerAtelier(blocs, etat, historique, frequences)
      : [];
  const comptes = compterStatuts(atelier);
  const retenus = selectionner(atelier, filtres);
  const frequenceConnue = atelier.some((b) => b.effectif !== null);
  const pourcent =
    blocs.length === 0 ? 0 : Math.round((comptes.relu / blocs.length) * 100);

  const statuts = {
    a_relire: t('statuts.a_relire'),
    a_corriger: t('statuts.a_corriger'),
    relu: t('statuts.relu')
  };
  const verdict = {
    commentaire: t('formulaire.commentaire'),
    commentaireAide: t('formulaire.commentaireAide'),
    relu: t('formulaire.relu'),
    aCorriger: t('formulaire.aCorriger'),
    envoi: t('formulaire.envoi'),
    reluFait: t('formulaire.reluFait'),
    corrigerFait: t('formulaire.corrigerFait'),
    perime: t('formulaire.perime'),
    invalide: t('formulaire.invalide'),
    commentaireRequis: t('formulaire.commentaireRequis'),
    interdit: t('formulaire.interdit'),
    plafond: t('formulaire.plafond'),
    erreur: t('formulaire.erreur')
  };
  const sections = {
    description: mes('vue.description'),
    apport: mes('vue.apport'),
    cout: mes('vue.cout'),
    question: mes('vue.question')
  };

  const libelles = (b: BlocAtelier): BlocCarteLabels => {
    const domaine = b.bloc.facette[0] as 'N' | 'E' | 'O' | 'A' | 'C';
    return {
      statuts,
      facette: facetLabel(domaine, Number(b.bloc.facette[1]), locale),
      domaine: domainLabel(domaine, locale),
      niveau: t('bloc.niveau', { niveau: niv(b.bloc.niveau) }),
      frequence:
        b.effectif === null
          ? t('bloc.effectifInconnu')
          : t('bloc.effectif', { n: formatNombre(b.effectif, locale) }),
      profils: t('bloc.profils'),
      aucunProfil: t('bloc.aucunProfil'),
      texteModifie: t('bloc.texteModifie'),
      sections,
      formesAccordees: t('bloc.formesAccordees'),
      masculin: t('bloc.masculin'),
      feminin: t('bloc.feminin'),
      historique: t(admin ? 'bloc.historique' : 'bloc.mesVerdicts', {
        n: formatNombre(b.historique.length, locale)
      }),
      historiqueVide: t(admin ? 'bloc.historiqueVide' : 'bloc.mesVerdictsVide'),
      verdict: {
        ...verdict,
        groupe: t('formulaire.groupe', {
          bloc: isolerEnArabe(b.bloc.id, locale)
        })
      }
    };
  };

  const lignesHistorique = (b: BlocAtelier): HistoriqueLigne[] =>
    b.historique.map((e) => ({
      id: e.id,
      statut: e.verdict === 'relu' ? 'relu' : 'a_corriger',
      quand: formatDateHeure(e.creeLe, locale, FUSEAU_MAROC),
      qui: t('bloc.par', {
        qui: e.estMoi
          ? t('bloc.vous')
          : e.relecteurNom
            ? isolerEnArabe(e.relecteurNom, locale)
            : e.relecteurAdresse
              ? isolerEnArabe(e.relecteurAdresse, locale)
              : t('bloc.auteurEfface')
      }),
      commentaire: e.commentaire,
      ancienTexte:
        e.empreinte === b.bloc.empreinte ? null : t('bloc.ancienTexte')
    }));

  const filtresStatut: readonly FiltreStatut[] = [...STATUTS_ATELIER, 'tous'];
  const compteFiltre = (s: FiltreStatut): number =>
    s === 'tous' ? atelier.length : comptes[s];

  return (
    <article>
      <header className='pb-12 lg:pb-16'>
        <p className='text-petit font-medium text-texte-3'>{t('title')}</p>
        <h1
          className={`${title({ size: 'display' })} mt-4 max-w-[14em] text-balance`}
        >
          <MotsCinetiques texte={t('headline')} />
        </h1>
        <p className='apparait-tard mt-8 max-w-[40em] text-chapo text-texte-2'>
          {t('intro')}
        </p>
        <p className='apparait-tard mt-3 text-petit text-texte-3'>
          {t('acces')}
        </p>
        {!admin && (
          <p className='apparait-tard mt-2 max-w-[40em] text-petit text-texte-3'>
            {t('historiqueReserve')}
          </p>
        )}
        <p className='apparait-tard mt-2 max-w-[40em] text-petit text-texte-3'>
          {t('conservation', {
            jours: formatNombre(CONSERVATION_RELECTURE_JOURS, locale)
          })}
        </p>
      </header>

      {!disponible ? (
        <p
          role='status'
          className='rounded-controle bg-avis-doux p-4 text-avis colonne-lecture'
        >
          {t('indisponible')}
        </p>
      ) : (
        <AnnoncesRelecture>
          <section
            aria-labelledby='avancement-titre'
            className='grid gap-x-8 gap-y-6 border-t-2 border-encre py-10 lg:grid-cols-12'
          >
            <h2
              id='avancement-titre'
              className='text-petit font-medium text-texte-3 lg:col-span-4'
            >
              {t('avancementTitre')}
            </h2>
            <div className='lg:col-span-8'>
              <p
                aria-hidden='true'
                className='chiffres font-display text-geant text-encre'
              >
                <bdi dir='ltr'>
                  {formatNombre(comptes.relu, locale)}
                  <span className='text-texte-3'>
                    {' / '}
                    {formatNombre(blocs.length, locale)}
                  </span>
                </bdi>
              </p>
              <p className='mt-2 text-chapo text-texte-2'>
                {t('avancement', {
                  relus: formatNombre(comptes.relu, locale),
                  total: formatNombre(blocs.length, locale)
                })}
              </p>
              <div
                aria-hidden='true'
                className='mt-6 h-2 w-full overflow-hidden rounded-full bg-piste'
              >
                <div
                  className='h-full rounded-full bg-safran'
                  style={{ width: `${pourcent}%` }}
                />
              </div>
            </div>
          </section>

          <nav
            aria-labelledby='filtres-titre'
            className='flex flex-col gap-6 border-t border-trait py-8 md:flex-row md:flex-wrap md:items-end md:justify-between'
          >
            <h2 id='filtres-titre' className='sr-only'>
              {t('filtresTitre')}
            </h2>
            <div>
              <p className='text-petit font-medium text-texte-3'>
                {t('filtreLegende')}
              </p>
              <ul role='list' className='mt-3 flex flex-wrap gap-2'>
                {filtresStatut.map((s) => {
                  const actif = filtres.statut === s;
                  return (
                    <li key={s}>
                      <Link
                        href={lienAtelier({ statut: s, tri: filtres.tri })}
                        aria-current={actif ? 'page' : undefined}
                        className={segment(actif)}
                      >
                        {s === 'tous' ? t('tous') : statuts[s]}
                        <span
                          className={clsx(
                            'chiffres',
                            actif ? 'opacity-80' : 'text-texte-3'
                          )}
                        >
                          {formatNombre(compteFiltre(s), locale)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className='text-petit font-medium text-texte-3'>
                {t('triLegende')}
              </p>
              <ul role='list' className='mt-3 flex flex-wrap gap-2'>
                {TRIS_ATELIER.map((tri) => {
                  const actif = filtres.tri === tri;
                  return (
                    <li key={tri}>
                      <Link
                        href={lienAtelier({ statut: filtres.statut, tri })}
                        aria-current={actif ? 'page' : undefined}
                        className={segment(actif)}
                      >
                        {t(`tris.${tri}`)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          <div className='flex flex-col gap-1 pb-4 text-petit text-texte-2'>
            <p>
              {frequenceConnue
                ? t('frequenceObservee')
                : t('frequenceIndisponible')}
            </p>
            {/* Repli du focus quand un verdict vide la sélection. */}
            <p id={REPLI_FOCUS_ID} tabIndex={-1} className='chiffres'>
              {t('selection', { n: formatNombre(retenus.length, locale) })}
            </p>
          </div>

          {retenus.length === 0 ? (
            <p className='border-t border-trait py-10 text-texte-2'>
              {t('vide')}
            </p>
          ) : (
            <ol role='list' className='border-b border-trait'>
              {retenus.map((b) => (
                <li key={b.bloc.id}>
                  <BlocCarte
                    locale={locale}
                    atelier={b}
                    profils={b.profils.map((code) => ({
                      code,
                      nom: nomProfilApercu(code)
                    }))}
                    historique={lignesHistorique(b)}
                    labels={libelles(b)}
                  />
                </li>
              ))}
            </ol>
          )}
        </AnnoncesRelecture>
      )}

      {admin && (
        <section
          aria-labelledby='relecteurs-titre'
          className='mt-16 border-t-2 border-encre py-12'
        >
          <h2
            id='relecteurs-titre'
            tabIndex={-1}
            className='text-titre-section text-encre'
          >
            {t('relecteurs.titre')}
          </h2>
          <p className='mt-3 colonne-lecture text-texte-2'>
            {t('relecteurs.intro')}
          </p>
          <RelecteursPanel
            locale={locale}
            headingId='relecteurs-titre'
            lignes={
              relecteurs === null
                ? null
                : relecteurs.map((r) => {
                    // Compte sans adresse (GoTrue le permet) : mention à la place.
                    const adresse =
                      r.adresse === null
                        ? t('relecteurs.sansAdresse')
                        : isolerEnArabe(r.adresse, locale);
                    return {
                      userId: r.userId,
                      adresse: r.adresse,
                      ajouteLe: formatDate(r.ajouteLe, locale, FUSEAU_MAROC),
                      confirmer: t('relecteurs.confirmer', { adresse }),
                      retirerAria: t('relecteurs.retirerAria', { adresse })
                    };
                  })
            }
            labels={{
              adresse: t('relecteurs.adresse'),
              designer: t('relecteurs.designer'),
              designerAide: t('relecteurs.designerAide'),
              envoi: t('relecteurs.envoi'),
              ajoute: t('relecteurs.ajoute'),
              deja: t('relecteurs.deja'),
              inconnu: t('relecteurs.inconnu'),
              invalide: t('relecteurs.invalide'),
              plafond: t('relecteurs.plafond'),
              erreur: t('relecteurs.erreur'),
              legende: t('relecteurs.legende'),
              sansAdresse: t('relecteurs.sansAdresse'),
              colAdresse: t('relecteurs.colAdresse'),
              colAjout: t('relecteurs.colAjout'),
              colAction: t('relecteurs.colAction'),
              vide: t('relecteurs.vide'),
              indisponible: t('relecteurs.indisponible'),
              retirer: t('relecteurs.retirer'),
              retire: t('relecteurs.retire'),
              absent: t('relecteurs.absent'),
              retraitInvalide: t('relecteurs.retraitInvalide'),
              interdit: t('relecteurs.interdit'),
              retraitErreur: t('relecteurs.retraitErreur')
            }}
          />
        </section>
      )}
    </article>
  );
}
