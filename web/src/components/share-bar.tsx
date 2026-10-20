import { getTranslations } from 'next-intl/server';
import { ShareBarButtons } from './share-bar-buttons';

interface ShareBarProps {
  link: string;
  description: string;
  // Identifiant du résultat : l'envoi par e-mail n'existe que pour un résultat.
  resultId?: string;
}

// Composant serveur : lit les libellés traduits, puis délègue les boutons au
// composant client. Zone du lot 3 (suppression du partage) : rien de plus.
export default async function ShareBar({
  link,
  description,
  resultId
}: ShareBarProps) {
  const t = await getTranslations('share');
  const r = await getTranslations('results');
  return (
    <ShareBarButtons
      link={link}
      description={description}
      resultId={resultId}
      labels={{
        facebook: t('facebook'),
        x: t('x'),
        print: r('print'),
        mail: t('mail'),
        copy: t('copy')
      }}
    />
  );
}
