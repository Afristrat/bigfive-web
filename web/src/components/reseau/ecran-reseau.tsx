'use client';

import clsx from 'clsx';
import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
  type RefObject
} from 'react';
import { secondaryButtonClass } from '@/components/form-styles';
import styles from '@/components/formulaires.module.css';
import { LiveMessage } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import type { LibellesReseau } from '@/components/reseau/libelles';
import { formatNombre, remplir } from '@/lib/format';
import {
  INTERACTION_INITIALE,
  cleAccords,
  doitConfirmerRefus,
  messageReseau,
  reduireInteraction,
  type EvenementInteraction,
  type Panneau
} from '@/lib/reseau-interaction';
import {
  LIENS,
  SUCCES_RESEAU,
  brouillonDepuis,
  cleReponse,
  etapeReseau,
  manquantes,
  peutRetirer,
  reponsesDepuis,
  valeursDuLien,
  type ActionsReseau,
  type Brouillon,
  type EtapeReseau,
  type Lien,
  type MembreReseau,
  type ReleveReseau,
  type ReponseLien,
  type ResultatReseau
} from '@/lib/reseau-releve';
import { Link, useRouter } from '@/navigation';

// Écran du relevé du réseau réel, en trois temps : (1) information des
// personnes citées, avec opposition possible ; (2) consentement, deux cases
// distinctes jamais cochées d'office ; (3) liste fermée, quatre questions par
// membre, un seul enregistrement. Le retrait et l'opposition restent possibles
// ensuite, campagne close comprise. La base décide de tout : l'écran envoie
// l'action reçue en props (réelle, ou neutre dans l'aperçu), dit ce qui s'est
// passé dans une région vivante persistante, puis rafraîchit la page pour
// suivre l'état réel. Panneaux, focus et messages suivent la logique pure de
// lib/reseau-interaction (testée sans DOM). Mouvement : la nouvelle étape
// monte à sa place (courbe de la marque) ; sous « réduire les animations »,
// tout est posé d'emblée.

type Props = {
  participationId: string;
  releve: ReleveReseau;
  /** Statut réel de la campagne, pour dire « pas encore ouvert » plutôt que « close ». */
  statutCampagne: 'brouillon' | 'ouverte' | 'close';
  actions: ActionsReseau;
  libelles: LibellesReseau;
  locale: string;
  /** Lien de connexion qui ramène à cette page (session expirée). */
  reconnexion: string;
};

type Enregistrer = (cle: string) => (noeud: HTMLElement | null) => void;
type Envoyer = (evenement: EvenementInteraction) => void;

const ETAPES = ['information', 'consentement', 'releve'] as const;

const titreClass = 'text-titre-2 text-encre focus:outline-none';
const texteClass = 'colonne-lecture text-corps text-texte-2';

export function EcranReseau({
  participationId,
  releve,
  statutCampagne,
  actions,
  libelles,
  locale,
  reconnexion
}: Props) {
  const base = useId();
  const router = useRouter();
  const [pending, demarrer] = useTransition();
  const [statut, setStatut] = useState<ResultatReseau['status'] | null>(null);
  const [incomplet, setIncomplet] = useState(false);
  const [interaction, dispatch] = useReducer(
    reduireInteraction,
    INTERACTION_INITIALE
  );

  const etape = etapeReseau(releve.moi);
  const ouverte = releve.campagneOuverte;
  const [brouillon, setBrouillon] = useState<Brouillon>(() =>
    brouillonDepuis(releve)
  );

  // Éléments à qui donner le focus : titre de l'étape, déclencheurs, boutons
  // de confirmation et premier champ des panneaux, enregistrés par clé.
  const titre = useRef<HTMLHeadingElement>(null);
  const noeuds = useRef(new Map<string, HTMLElement>());
  const enregistrer: Enregistrer = (cle) => (noeud) => {
    if (noeud) noeuds.current.set(cle, noeud);
    else noeuds.current.delete(cle);
  };

  // À chaque changement d'étape : focus au titre de la nouvelle étape, et le
  // brouillon repart des réponses enregistrées.
  const etapeAffichee = useRef(etape);
  useEffect(() => {
    if (etapeAffichee.current === etape) return;
    etapeAffichee.current = etape;
    setBrouillon(brouillonDepuis(releve));
    setIncomplet(false);
    titre.current?.focus();
  }, [etape, releve]);

  // Focus décidé par la logique d'interaction, posé une fois puis consommé.
  useEffect(() => {
    const cible = interaction.focus;
    if (!cible) return;
    const noeud =
      cible.cible === 'titre'
        ? titre.current
        : noeuds.current.get(`${cible.cible}:${cible.panneau}`);
    noeud?.focus();
    dispatch({ type: 'focusApplique' });
  }, [interaction.focus]);

  const envoyer = (action: () => Promise<ResultatReseau>): void => {
    if (pending) return;
    setIncomplet(false);
    demarrer(async () => {
      const retour = await action();
      setStatut(retour.status);
      if (SUCCES_RESEAU.includes(retour.status)) {
        dispatch({ type: 'succes' });
        router.refresh();
      } else if (retour.status === 'closed' || retour.status === 'invalid') {
        // L'état a changé ailleurs (clôture, liste de l'équipe) : la page le montre.
        router.refresh();
      }
    });
  };

  const restantes = manquantes(releve.membres, brouillon);
  const message = messageReseau(
    {
      pending,
      incomplet,
      restantes,
      statut,
      campagneOuverte: ouverte,
      locale
    },
    {
      working: libelles.working,
      manque: libelles.releve.manque,
      messages: libelles.messages
    }
  );

  // Interrupteur fermé avec ma ligne : retrait et opposition seulement.
  const ferme = releve.ferme;
  const vue = ferme ? 'ferme' : etape;
  const numeroEtape = ferme
    ? -1
    : ETAPES.indexOf(etape as (typeof ETAPES)[number]);
  const bandeau =
    ouverte || ferme
      ? null
      : statutCampagne === 'brouillon'
        ? libelles.brouillon
        : libelles.close;
  const accordsOuverts =
    interaction.panneau === 'accords' || interaction.panneau === 'refus';

  return (
    <div data-etape={vue} className='flex flex-col gap-10'>
      {numeroEtape >= 0 && (
        <Avancement
          etape={etape}
          libelles={libelles}
          position={remplir(libelles.etapes.position, {
            numero: formatNombre(numeroEtape + 1, locale),
            total: formatNombre(ETAPES.length, locale)
          })}
        />
      )}

      {bandeau && (
        <div
          role='note'
          className='colonne-lecture border-s-2 border-safran bg-surface px-5 py-4'
        >
          <p className='font-semibold text-encre'>{bandeau.titre}</p>
          <p className='mt-1 text-petit text-texte-2'>{bandeau.texte}</p>
        </div>
      )}

      <section
        key={vue}
        aria-labelledby={`${base}-titre`}
        className={clsx('flex flex-col gap-6', styles.etape)}
      >
        {ferme && (
          <>
            <h2
              id={`${base}-titre`}
              ref={titre}
              tabIndex={-1}
              className={titreClass}
            >
              {etape === 'oppose'
                ? libelles.oppose.titre
                : libelles.ferme.titre}
            </h2>
            <p className={texteClass}>{libelles.ferme.texte}</p>
            {/* La base refuse de lever une opposition relevé fermé : on dit
                seulement quand ce sera possible. */}
            {etape === 'oppose' && (
              <p className={texteClass}>{libelles.ferme.leverPlusTard}</p>
            )}
            <Mentions libelles={libelles} />
          </>
        )}

        {!ferme && etape === 'information' && (
          <EtapeInformation
            base={base}
            titre={titre}
            libelles={libelles}
            pending={pending}
            onEnvoyer={(opposition) =>
              envoyer(() => actions.informer(participationId, opposition))
            }
          />
        )}

        {!ferme && etape === 'consentement' && (
          <>
            <h2
              id={`${base}-titre`}
              ref={titre}
              tabIndex={-1}
              className={titreClass}
            >
              {libelles.consentement.titre}
            </h2>
            <p className={texteClass}>{libelles.consentement.texte}</p>
            <Mentions libelles={libelles} />
            {ouverte && (
              <FormulaireAccords
                key={`accords-${cleAccords(releve.moi)}`}
                base={`${base}-accords`}
                libelles={libelles}
                pending={pending}
                repondreAccorde={releve.moi?.accordRepondreLe != null}
                carteAccordee={releve.moi?.accordCarteLe != null}
                panneau={interaction.panneau}
                dispatch={dispatch}
                enregistrer={enregistrer}
                onEnvoyer={(repondre, carte) =>
                  envoyer(() =>
                    actions.consentir(participationId, repondre, carte)
                  )
                }
              />
            )}
          </>
        )}

        {!ferme && etape === 'releve' && (
          <>
            <h2
              id={`${base}-titre`}
              ref={titre}
              tabIndex={-1}
              className={titreClass}
            >
              {ouverte ? libelles.releve.titre : libelles.releve.lectureSeule}
            </h2>
            {ouverte && <p className={texteClass}>{libelles.releve.intro}</p>}
            <ResumeAccords
              base={`${base}-modifier`}
              releve={releve}
              libelles={libelles}
              modifiable={ouverte}
              ouvert={accordsOuverts}
              enregistrer={enregistrer}
              onBasculer={() =>
                dispatch({ type: 'ouvrir', panneau: 'accords' })
              }
            />
            {ouverte && accordsOuverts && (
              <div
                id={`${base}-modifier-panneau`}
                className='carte flex flex-col gap-5'
              >
                <Mentions libelles={libelles} />
                <FormulaireAccords
                  key={`accords-${cleAccords(releve.moi)}`}
                  base={`${base}-modifier`}
                  libelles={libelles}
                  pending={pending}
                  repondreAccorde={releve.moi?.accordRepondreLe != null}
                  carteAccordee={releve.moi?.accordCarteLe != null}
                  panneau={interaction.panneau}
                  dispatch={dispatch}
                  enregistrer={enregistrer}
                  premierChamp
                  onEnvoyer={(repondre, carte) =>
                    envoyer(() =>
                      actions.consentir(participationId, repondre, carte)
                    )
                  }
                  onAnnuler={() => dispatch({ type: 'fermer' })}
                />
              </div>
            )}
            {releve.membres.length === 0 ? (
              // Campagne fermée aux réponses sans membre listé : rien à lire ni à attendre.
              ouverte && (
                <p className='colonne-lecture border-t-2 border-encre pt-6 text-chapo text-texte-2'>
                  {libelles.releve.vide}
                </p>
              )
            ) : ouverte ? (
              <ListeFermee
                base={base}
                membres={releve.membres}
                brouillon={brouillon}
                setBrouillon={setBrouillon}
                libelles={libelles}
                locale={locale}
                pending={pending}
                onIncomplet={() => {
                  setStatut(null);
                  setIncomplet(true);
                }}
                onEnvoyer={(reponses) =>
                  envoyer(() => actions.repondre(participationId, reponses))
                }
              />
            ) : (
              <LectureSeule
                releve={releve}
                libelles={libelles}
                locale={locale}
              />
            )}
          </>
        )}

        {!ferme && etape === 'oppose' && (
          <>
            <h2
              id={`${base}-titre`}
              ref={titre}
              tabIndex={-1}
              className={titreClass}
            >
              {libelles.oppose.titre}
            </h2>
            <p className={texteClass}>{libelles.oppose.texte}</p>
            <p>
              <button
                type='button'
                className={secondaryButtonClass}
                aria-disabled={pending ? true : undefined}
                onClick={() =>
                  envoyer(() => actions.informer(participationId, false))
                }
              >
                {libelles.oppose.lever}
              </button>
            </p>
          </>
        )}
      </section>

      <LiveMessage ton={message?.ton ?? 'info'} className='colonne-lecture'>
        {message ? (
          <>
            <p>{message.texte}</p>
            {message.reconnexion && (
              <Link
                href={reconnexion}
                className='font-semibold text-accent underline underline-offset-2'
              >
                {libelles.reconnexionLien}
              </Link>
            )}
          </>
        ) : null}
      </LiveMessage>

      {(ferme
        ? etape !== 'oppose'
        : etape === 'consentement' || etape === 'releve') && (
        <div className='flex flex-col gap-4 border-t border-trait pt-8'>
          {peutRetirer(releve) && (
            <ActionConfirmee
              base={`${base}-retrait`}
              panneau='retrait'
              ouverte={interaction.panneau === 'retrait'}
              bouton={libelles.retrait.bouton}
              aide={
                ouverte ? libelles.retrait.aideOuverte : libelles.retrait.aide
              }
              confirmer={libelles.retrait.confirmer}
              annuler={libelles.retrait.annuler}
              working={libelles.working}
              pending={pending}
              enregistrer={enregistrer}
              dispatch={dispatch}
              onConfirmer={() =>
                envoyer(() => actions.retirer(participationId))
              }
            />
          )}
          <ActionConfirmee
            base={`${base}-opposition`}
            panneau='opposition'
            ouverte={interaction.panneau === 'opposition'}
            bouton={libelles.opposer.bouton}
            aide={libelles.opposer.aide}
            confirmer={libelles.opposer.confirmer}
            annuler={libelles.opposer.annuler}
            working={libelles.working}
            pending={pending}
            enregistrer={enregistrer}
            dispatch={dispatch}
            onConfirmer={() =>
              envoyer(() => actions.informer(participationId, true))
            }
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avancement : trois segments dans une liste nommée, l'étape courante marquée
// par aria-current, par un trait plein et par la graisse (jamais par la
// couleur seule).

function Avancement({
  etape,
  libelles,
  position
}: {
  etape: EtapeReseau;
  libelles: LibellesReseau;
  position: string;
}) {
  const rang = ETAPES.indexOf(etape as (typeof ETAPES)[number]);
  return (
    <div>
      <p className='chiffres text-petit font-medium text-texte-3'>{position}</p>
      <ol
        aria-label={libelles.etapes.legende}
        className='mt-3 grid grid-cols-3 gap-2'
      >
        {ETAPES.map((e, i) => (
          <li
            key={e}
            aria-current={e === etape ? 'step' : undefined}
            className={clsx(
              'flex min-w-0 flex-col gap-2 text-petit',
              i === rang ? 'font-semibold text-encre' : 'text-texte-2'
            )}
          >
            <span
              aria-hidden='true'
              className={clsx(
                'block h-1 rounded-full transition-colors duration-normale ease-tenga',
                i < rang ? 'bg-encre' : i === rang ? 'bg-safran' : 'bg-piste'
              )}
            />
            <span className='[overflow-wrap:anywhere]'>
              {libelles.etapes[e]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mentions juridiques communes aux deux textes.

function Mentions({ libelles }: { libelles: LibellesReseau }) {
  const { mentions } = libelles;
  let contact: ReactNode;
  if ('repli' in mentions.contact) {
    contact = mentions.contact.repli;
  } else {
    const [avant = '', apres = ''] = mentions.contact.modele.split('{contact}');
    contact = (
      <>
        {avant}
        <a
          href={`mailto:${mentions.contact.adresse}`}
          className='font-medium text-accent underline underline-offset-2 [overflow-wrap:anywhere] hover:text-accent-survol'
        >
          <bdi>{mentions.contact.adresse}</bdi>
        </a>
        {apres}
      </>
    );
  }
  return (
    <div className='colonne-lecture border-s-2 border-safran ps-4 text-petit text-texte-2'>
      <p className='font-semibold text-encre'>{mentions.titre}</p>
      <ul className='mt-2 flex flex-col gap-1'>
        <li>{mentions.responsable}</li>
        <li>{contact}</li>
        <li>{mentions.conservation}</li>
        <li>{mentions.cndp}</li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Case à cocher sur une ligne de 44 px au moins, libellé cliquable en entier.

function Case({
  id,
  name,
  checked,
  onChange,
  libelle,
  aide,
  refEntree
}: {
  id: string;
  name: string;
  checked: boolean;
  onChange: (valeur: boolean) => void;
  libelle: string;
  aide?: string;
  refEntree?: (noeud: HTMLElement | null) => void;
}) {
  return (
    <div className='colonne-lecture'>
      <label
        htmlFor={id}
        className={clsx(
          'flex min-h-11 cursor-pointer items-start gap-3 rounded-controle border bg-surface px-4 py-3 text-corps text-encre transition-colors duration-courte ease-tenga',
          checked
            ? 'border-accent'
            : 'border-trait [@media(hover:hover)]:hover:border-trait-fort'
        )}
      >
        <input
          ref={refEntree}
          id={id}
          type='checkbox'
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={aide ? `${id}-aide` : undefined}
          className='mt-0.5 size-5 shrink-0 cursor-pointer accent-accent'
        />
        <span className={checked ? 'font-semibold' : 'font-medium'}>
          {libelle}
        </span>
      </label>
      {aide && (
        <p id={`${id}-aide`} className='mt-2 ps-4 text-petit text-texte-2'>
          {aide}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Premier temps.

function EtapeInformation({
  base,
  titre,
  libelles,
  pending,
  onEnvoyer
}: {
  base: string;
  titre: RefObject<HTMLHeadingElement | null>;
  libelles: LibellesReseau;
  pending: boolean;
  onEnvoyer: (opposition: boolean) => void;
}) {
  const [opposition, setOpposition] = useState(false);
  const soumettre = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onEnvoyer(opposition);
  };
  return (
    <>
      <h2 id={`${base}-titre`} ref={titre} tabIndex={-1} className={titreClass}>
        {libelles.information.titre}
      </h2>
      <p className={texteClass}>{libelles.information.texte}</p>
      <Mentions libelles={libelles} />
      <form onSubmit={soumettre} noValidate className='flex flex-col gap-5'>
        <Case
          id={`${base}-opposition`}
          name='opposition'
          checked={opposition}
          onChange={setOpposition}
          libelle={libelles.information.opposition}
          aide={libelles.information.oppositionAide}
        />
        <div>
          <PendingButton
            pending={pending}
            label={pending ? libelles.working : libelles.information.lu}
          />
        </div>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Deuxième temps : deux accords distincts. Retirer l'accord de répondre
// supprime les réponses : ce geste passe par une confirmation.

function FormulaireAccords({
  base,
  libelles,
  pending,
  repondreAccorde,
  carteAccordee,
  panneau,
  dispatch,
  enregistrer,
  premierChamp = false,
  onEnvoyer,
  onAnnuler
}: {
  base: string;
  libelles: LibellesReseau;
  pending: boolean;
  repondreAccorde: boolean;
  carteAccordee: boolean;
  panneau: Panneau | null;
  dispatch: Envoyer;
  enregistrer: Enregistrer;
  /** Vrai quand le formulaire est le contenu du panneau « Modifier mes accords ». */
  premierChamp?: boolean;
  onEnvoyer: (repondre: boolean, carte: boolean) => void;
  onAnnuler?: () => void;
}) {
  const [repondre, setRepondre] = useState(repondreAccorde);
  const [carte, setCarte] = useState(carteAccordee);
  const soumettre = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (pending) return;
    if (doitConfirmerRefus(repondreAccorde, repondre)) {
      dispatch({ type: 'ouvrir', panneau: 'refus' });
      return;
    }
    onEnvoyer(repondre, carte);
  };
  const caseRepondre = (noeud: HTMLElement | null): void => {
    enregistrer('declencheur:refus')(noeud);
    if (premierChamp) enregistrer('premierChamp:accords')(noeud);
  };
  return (
    <form onSubmit={soumettre} noValidate className='flex flex-col gap-4'>
      <Case
        id={`${base}-repondre`}
        name='repondre'
        checked={repondre}
        onChange={(valeur) => {
          setRepondre(valeur);
          if (valeur) dispatch({ type: 'repondreRecoche' });
        }}
        libelle={libelles.consentement.repondre}
        aide={libelles.consentement.refusAide}
        refEntree={caseRepondre}
      />
      <Case
        id={`${base}-carte`}
        name='carte'
        checked={carte}
        onChange={setCarte}
        libelle={libelles.consentement.carte}
        aide={libelles.consentement.carteAide}
      />
      {panneau === 'refus' ? (
        <PanneauConfirmation
          id={`${base}-refus`}
          panneau='refus'
          aide={libelles.consentement.refusAide}
          confirmer={libelles.consentement.confirmerRefus}
          annuler={libelles.accords.annuler}
          working={libelles.working}
          pending={pending}
          enregistrer={enregistrer}
          onConfirmer={() => onEnvoyer(repondre, carte)}
          onAnnuler={() => dispatch({ type: 'fermer' })}
        />
      ) : (
        <div className='flex flex-wrap gap-3'>
          <PendingButton
            pending={pending}
            label={
              pending ? libelles.working : libelles.consentement.enregistrer
            }
          />
          {onAnnuler && (
            <button
              type='button'
              className={secondaryButtonClass}
              onClick={onAnnuler}
            >
              {libelles.accords.annuler}
            </button>
          )}
        </div>
      )}
    </form>
  );
}

function ResumeAccords({
  base,
  releve,
  libelles,
  modifiable,
  ouvert,
  enregistrer,
  onBasculer
}: {
  base: string;
  releve: ReleveReseau;
  libelles: LibellesReseau;
  modifiable: boolean;
  ouvert: boolean;
  enregistrer: Enregistrer;
  onBasculer: () => void;
}) {
  const carte = releve.moi?.accordCarteLe != null;
  return (
    <div className='colonne-lecture flex flex-col gap-3 rounded-panneau border border-trait bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='text-petit text-texte-2'>
        <p className='font-semibold text-encre'>{libelles.accords.titre}</p>
        <p className='mt-1'>{libelles.accords.repondre}</p>
        <p>{carte ? libelles.accords.carteOui : libelles.accords.carteNon}</p>
      </div>
      {modifiable && (
        <button
          ref={enregistrer('declencheur:accords')}
          type='button'
          className={clsx(secondaryButtonClass, 'shrink-0')}
          aria-expanded={ouvert}
          aria-controls={ouvert ? `${base}-panneau` : undefined}
          onClick={onBasculer}
        >
          {libelles.accords.modifier}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Troisième temps : la liste fermée.

const nomAffiche = (
  membre: MembreReseau,
  index: number,
  libelles: LibellesReseau,
  locale: string
): ReactNode =>
  membre.nom ? (
    <bdi>{membre.nom}</bdi>
  ) : (
    remplir(libelles.releve.repli, { numero: formatNombre(index + 1, locale) })
  );

function ListeFermee({
  base,
  membres,
  brouillon,
  setBrouillon,
  libelles,
  locale,
  pending,
  onIncomplet,
  onEnvoyer
}: {
  base: string;
  membres: MembreReseau[];
  brouillon: Brouillon;
  setBrouillon: (modifier: (avant: Brouillon) => Brouillon) => void;
  libelles: LibellesReseau;
  locale: string;
  pending: boolean;
  onIncomplet: () => void;
  onEnvoyer: (reponses: ReponseLien[]) => void;
}) {
  const total = membres.length * LIENS.length;
  const restantes = manquantes(membres, brouillon);
  const faites = total - restantes;

  const choisir = (cite: string, lien: Lien, valeur: number): void =>
    setBrouillon((avant) => ({ ...avant, [cleReponse(cite, lien)]: valeur }));

  const soumettre = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (pending) return;
    if (restantes > 0) {
      onIncomplet();
      const premier = membres.findIndex((m) =>
        LIENS.some(
          (lien) => brouillon[cleReponse(m.participationId, lien)] === undefined
        )
      );
      document.getElementById(`${base}-membre-${premier}`)?.focus();
      return;
    }
    onEnvoyer(reponsesDepuis(membres, brouillon));
  };

  return (
    <form onSubmit={soumettre} noValidate className='flex flex-col gap-6'>
      <ol className='flex flex-col gap-6'>
        {membres.map((membre, index) => {
          const faitesMembre = LIENS.filter(
            (lien) =>
              brouillon[cleReponse(membre.participationId, lien)] !== undefined
          ).length;
          return (
            <li
              key={membre.participationId}
              className={styles.entree}
              style={{ ['--i' as string]: Math.min(index, 6) }}
            >
              <fieldset
                id={`${base}-membre-${index}`}
                tabIndex={-1}
                className='min-w-0 rounded-panneau border border-trait bg-surface p-4 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-anneau sm:p-6'
              >
                <legend className='float-start w-full'>
                  <span className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                    <span className='text-titre-3 text-encre [overflow-wrap:anywhere]'>
                      {nomAffiche(membre, index, libelles, locale)}
                    </span>
                    <span
                      aria-hidden='true'
                      className={clsx(
                        'chiffres text-petit font-medium',
                        faitesMembre === LIENS.length
                          ? 'text-encre'
                          : 'text-texte-3'
                      )}
                    >
                      {remplir(libelles.releve.compteMembre, {
                        faites: formatNombre(faitesMembre, locale),
                        total: formatNombre(LIENS.length, locale)
                      })}
                    </span>
                  </span>
                </legend>
                <div className='clear-both flex flex-col gap-6 pt-5'>
                  {LIENS.map((lien) => (
                    <Question
                      key={lien}
                      id={`${base}-q-${index}-${lien}`}
                      lien={lien}
                      libelles={libelles}
                      valeur={
                        brouillon[cleReponse(membre.participationId, lien)]
                      }
                      onChoisir={(v) =>
                        choisir(membre.participationId, lien, v)
                      }
                    />
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className='sticky bottom-0 flex flex-col gap-3 border-t border-trait bg-fond py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0 flex-1'>
          <p className='chiffres text-petit font-medium text-texte-2'>
            {remplir(libelles.releve.progression, {
              faites: formatNombre(faites, locale),
              total: formatNombre(total, locale)
            })}
          </p>
          <div
            aria-hidden='true'
            className='mt-2 h-1 overflow-hidden rounded-full bg-piste'
          >
            <div
              className='h-full bg-safran transition-transform duration-normale ease-tenga ltr:origin-left rtl:origin-right'
              style={{
                transform: `scaleX(${total === 0 ? 0 : faites / total})`
              }}
            />
          </div>
        </div>
        <PendingButton
          pending={pending}
          label={pending ? libelles.working : libelles.releve.enregistrer}
        />
      </div>
    </form>
  );
}

// Une question : groupe de boutons radio natifs (les flèches du clavier
// changent le choix). Le choix coché porte une pastille pleine, un contour et
// une graisse plus forte, pas la couleur seule. Cibles de 44 px au moins.
function Question({
  id,
  lien,
  libelles,
  valeur,
  onChoisir
}: {
  id: string;
  lien: Lien;
  libelles: LibellesReseau;
  valeur: number | undefined;
  onChoisir: (valeur: number) => void;
}) {
  const valeurs = valeursDuLien(lien);
  return (
    <div role='radiogroup' aria-labelledby={id}>
      <p id={id} className='text-corps font-medium text-encre'>
        {libelles.releve.questions[lien]}
      </p>
      <div
        className={clsx(
          'mt-3 grid grid-cols-2 gap-2',
          valeurs.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
        )}
      >
        {valeurs.map((v) => {
          const coche = valeur === v;
          return (
            <label key={v} className='relative block'>
              <input
                type='radio'
                name={id}
                value={v}
                checked={coche}
                onChange={() => onChoisir(v)}
                className='peer sr-only'
              />
              <span
                className={clsx(
                  'flex min-h-11 cursor-pointer items-center gap-2 rounded-controle border px-3 py-2 text-petit leading-snug transition-[border-color,background-color,transform] duration-courte ease-tenga active:scale-[0.97] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-anneau motion-reduce:active:scale-100',
                  coche
                    ? 'border-accent bg-accent-doux font-semibold text-encre'
                    : 'border-trait bg-surface font-medium text-texte-2 [@media(hover:hover)]:hover:border-trait-fort [@media(hover:hover)]:hover:text-encre'
                )}
              >
                <span
                  aria-hidden='true'
                  className={clsx(
                    'grid size-4 flex-none place-items-center rounded-full border-[1.5px] transition-colors duration-courte ease-tenga',
                    coche ? 'border-accent bg-accent' : 'border-trait-fort'
                  )}
                >
                  <span
                    className={clsx(
                      'size-1.5 rounded-full bg-sur-accent transition-[opacity,transform] duration-courte ease-tenga',
                      coche ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    )}
                  />
                </span>
                {libelles.releve.valeurs[lien][v]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// Campagne fermée aux réponses : mes réponses, en lecture seule.
function LectureSeule({
  releve,
  libelles,
  locale
}: {
  releve: ReleveReseau;
  libelles: LibellesReseau;
  locale: string;
}) {
  const brouillon = brouillonDepuis(releve);
  return (
    <ol className='flex flex-col gap-4'>
      {releve.membres.map((membre, index) => (
        <li
          key={membre.participationId}
          className='rounded-panneau border border-trait bg-surface p-4 sm:p-6'
        >
          <h3 className='text-titre-3 text-encre [overflow-wrap:anywhere]'>
            {nomAffiche(membre, index, libelles, locale)}
          </h3>
          <dl className='mt-4 flex flex-col gap-3'>
            {LIENS.map((lien) => {
              const v = brouillon[cleReponse(membre.participationId, lien)];
              return (
                <div key={lien}>
                  <dt className='text-petit text-texte-2'>
                    {libelles.releve.questions[lien]}
                  </dt>
                  <dd className='mt-0.5 font-semibold text-encre'>
                    {v === undefined
                      ? libelles.releve.sansReponse
                      : libelles.releve.valeurs[lien][v]}
                  </dd>
                </div>
              );
            })}
          </dl>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Confirmations. Le déclencheur reste monté (aria-expanded réel, aria-controls
// seulement quand le panneau existe) ; le panneau dit ce qui sera supprimé.
// Les focus (bouton de confirmation à l'ouverture, déclencheur à la fermeture)
// sont décidés par reduireInteraction.

function PanneauConfirmation({
  id,
  panneau,
  aide,
  confirmer,
  annuler,
  working,
  pending,
  enregistrer,
  onConfirmer,
  onAnnuler
}: {
  id: string;
  panneau: Panneau;
  aide: string;
  confirmer: string;
  annuler: string;
  working: string;
  pending: boolean;
  enregistrer: Enregistrer;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  return (
    <div
      id={id}
      className={clsx(
        'colonne-lecture flex flex-col gap-4 rounded-panneau border border-erreur/40 bg-erreur-doux px-5 py-4',
        styles.message
      )}
    >
      <p id={`${id}-aide`} className='text-petit text-encre'>
        {aide}
      </p>
      <div className='flex flex-wrap gap-3'>
        <button
          ref={enregistrer(`confirmation:${panneau}`)}
          type='button'
          aria-describedby={`${id}-aide`}
          aria-disabled={pending ? true : undefined}
          className='appui inline-flex min-h-11 items-center justify-center rounded-controle border border-transparent bg-erreur px-5 font-medium leading-tight text-surface'
          onClick={() => {
            if (!pending) onConfirmer();
          }}
        >
          {pending ? working : confirmer}
        </button>
        <button
          type='button'
          className={secondaryButtonClass}
          onClick={onAnnuler}
        >
          {annuler}
        </button>
      </div>
    </div>
  );
}

function ActionConfirmee({
  base,
  panneau,
  ouverte,
  bouton,
  aide,
  confirmer,
  annuler,
  working,
  pending,
  enregistrer,
  dispatch,
  onConfirmer
}: {
  base: string;
  panneau: Panneau;
  ouverte: boolean;
  bouton: string;
  aide: string;
  confirmer: string;
  annuler: string;
  working: string;
  pending: boolean;
  enregistrer: Enregistrer;
  dispatch: Envoyer;
  onConfirmer: () => void;
}) {
  const panneauId = `${base}-panneau`;
  return (
    <div className='flex flex-col gap-3'>
      <p>
        <button
          ref={enregistrer(`declencheur:${panneau}`)}
          type='button'
          className={secondaryButtonClass}
          aria-expanded={ouverte}
          aria-controls={ouverte ? panneauId : undefined}
          onClick={() => dispatch({ type: 'ouvrir', panneau })}
        >
          {bouton}
        </button>
      </p>
      {ouverte && (
        <PanneauConfirmation
          id={panneauId}
          panneau={panneau}
          aide={aide}
          confirmer={confirmer}
          annuler={annuler}
          working={working}
          pending={pending}
          enregistrer={enregistrer}
          onConfirmer={onConfirmer}
          onAnnuler={() => dispatch({ type: 'fermer' })}
        />
      )}
    </div>
  );
}
