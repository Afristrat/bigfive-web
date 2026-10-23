import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { locales } from '@/config/site';
import { construireMenuRapports, type MenuRapports } from '@/lib/rapports-menu';
import { loadFaitsRapports } from '@/lib/rapports-menu-data';
import { ACCESS_COOKIE } from '@/lib/session-cookies';
import { userClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Menu « Rapports » de l'en-tête. Les pages publiques restent statiques : le
// menu est demandé par l'en-tête après l'affichage, et le rôle est lu ici, côté
// serveur, avec l'identité de la personne. Sans session valide, la liste est
// vide et l'en-tête ne montre rien ; aucune donnée n'est mise en cache.

const sansCache = { 'Cache-Control': 'private, no-store' };

const reponse = (sections: MenuRapports, status = 200): NextResponse =>
  NextResponse.json({ sections }, { status, headers: sansCache });

export async function GET(request: NextRequest): Promise<NextResponse> {
  const locale = request.nextUrl.searchParams.get('locale') ?? '';
  if (!locales.includes(locale)) return reponse([], 400);

  // Visiteur : aucune requête vers GoTrue ni vers la base.
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!accessToken) return reponse([]);

  try {
    const user = await userClient(accessToken).getUser();
    if (!user) return reponse([]);
    const faits = await loadFaitsRapports({
      id: user.id,
      email: user.email,
      accessToken
    });
    // Les intitulés des pages visées sont repris tels quels : le menu nomme
    // chaque page comme elle se nomme elle-même.
    const t = await getTranslations({ locale });
    return reponse(
      construireMenuRapports(faits, {
        admin: t('account.adminLink'),
        organisations: t('pilotage.menu.organisations'),
        apercuResultats: t('apercu.title'),
        apercuRapport: t('pilotage.rapportCabinet.titre'),
        campagnes: t('pilotage.menu.campagnes'),
        resultats: t('pilotage.menu.resultats'),
        synthese: t('synthese.title'),
        parcours: t('pilotage.menu.parcours'),
        mesResultats: t('mesResultats.title'),
        mesBinomes: t('binome.liste.titre'),
        roles: {
          responsable: t('roles.responsable'),
          consultant: t('roles.consultant'),
          participant: t('roles.participant')
        }
      })
    );
  } catch {
    // Passerelle indisponible : l'en-tête reste sans menu, la page fonctionne.
    console.warn(JSON.stringify({ event: 'rapports_menu.unavailable' }));
    return reponse([], 503);
  }
}
