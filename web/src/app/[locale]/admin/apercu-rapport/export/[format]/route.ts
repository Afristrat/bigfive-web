import { rapportApercuHtml } from '@/data/rapport-apercu-html';
import {
  rapportApercuDocxBase64,
  rapportApercuMarkdown,
  rapportApercuPdfBase64
} from '@/data/rapport-apercu-fichiers';
import { requireAdmin } from '@/lib/session';

interface Fichier {
  type: string;
  nom: string;
  corps: () => BodyInit;
}

const octets = (base64: string): Uint8Array =>
  new Uint8Array(Buffer.from(base64, 'base64'));

// Données fixes de la maquette : profils fictifs et profil estimé (voir la page).
const fichiers: Record<string, Fichier> = {
  pdf: {
    type: 'application/pdf',
    nom: 'rapports-comparatifs.pdf',
    corps: () => octets(rapportApercuPdfBase64)
  },
  docx: {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    nom: 'rapports-comparatifs.docx',
    corps: () => octets(rapportApercuDocxBase64)
  },
  md: {
    type: 'text/markdown; charset=utf-8',
    nom: 'rapports-comparatifs.md',
    corps: () => rapportApercuMarkdown
  },
  html: {
    type: 'text/html; charset=utf-8',
    nom: 'rapports-comparatifs.html',
    corps: () => rapportApercuHtml
  }
};

interface Props {
  params: Promise<{ locale: string; format: string }>;
}

export async function GET(
  _request: Request,
  { params }: Props
): Promise<Response> {
  const { locale, format } = await params;
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  await requireAdmin(locale, `/admin/apercu-rapport/export/${format}`);
  const fichier = Object.keys(fichiers).includes(format)
    ? fichiers[format]
    : undefined;
  if (!fichier) return new Response('Format inconnu', { status: 404 });
  return new Response(fichier.corps(), {
    headers: {
      'Content-Type': fichier.type,
      'Content-Disposition': `attachment; filename="${fichier.nom}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
