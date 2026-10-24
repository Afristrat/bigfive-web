import { locales } from '@/config/site';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import {
  loadCampagneOrganisation,
  peutLireResultats
} from '@/lib/consultant-data';
import { exportReseauCampagne } from '@/lib/reseau-data';
import { requireViewer } from '@/lib/session';
import { parseCampaignId } from '@/lib/synthese-data';

interface Props {
  params: Promise<{ locale: string; slug: string; campagne: string }>;
}

export const dynamic = 'force-dynamic';

// Export JSON du relevé du réseau d'une campagne : le rendu de
// app.reseau_exporter (noms et réponses des personnes non opposées ; nombre
// d'oppositions par groupe ; les lignes des personnes opposées pour
// l'administrateur Tenga seul), pour préparer le rapport. Mêmes gardes que la
// page du consultant ; la base reste l'autorité, refuse le responsable et
// inscrit l'export au journal (reseau.exporter) avant de répondre. Tout
// refus : 404 vide.

const introuvable = (): Response =>
  new Response(null, {
    status: 404,
    headers: { 'Cache-Control': 'private, no-store' }
  });

export async function GET(
  _request: Request,
  { params }: Props
): Promise<Response> {
  const { locale, slug: rawSlug, campagne: rawCampagne } = await params;
  if (!locales.includes(locale)) return introuvable();
  const slug = parseOrgSlug(rawSlug);
  const campaignId = parseCampaignId(rawCampagne);
  if (!slug || !campaignId) return introuvable();

  // Sans session : redirection vers la connexion (retour sûr), comme la page.
  const viewer = await requireViewer(
    locale,
    `/o/${slug}/campagnes/${campaignId}/reseau/export`
  );
  const page = await loadOrgPage(viewer, slug);
  if (!page || !peutLireResultats({ isAdmin: page.isAdmin, role: page.role })) {
    return introuvable();
  }
  const campagne = await loadCampagneOrganisation(
    viewer,
    page.org.id,
    campaignId
  );
  if (!campagne) return introuvable();
  const rendu = await exportReseauCampagne(viewer, campaignId);
  if (!rendu) return introuvable();

  return new Response(JSON.stringify(rendu, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="reseau-${campaignId}.json"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
