import { getTranslations, setRequestLocale } from 'next-intl/server';
import { subtitle, title } from '@/components/primitives';
import { supportEmail } from '@/config/site';

interface Props {
  params: Promise<{ locale: string }>;
}

// Texte traduit en français et en arabe sans engagement nouveau : il relève
// d'Amine et d'une relecture juridique (textes.md § 9). L'arabe est validé par Amine (25/10/2026).
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('confidentialite');

  return (
    <article className='colonne-lecture'>
      <h1 className={title()}>{t('title')}</h1>
      <p className={subtitle()}>{t('subtitle')}</p>
      <div className='texte-riche mt-8'>
        <p>{t('intro')}</p>
        <h2>{t('collecte.titre')}</h2>
        <p>{t('collecte.intro')}</p>
        <ul>
          <li>{t('collecte.langue')}</li>
          <li>{t('collecte.reponses')}</li>
          <li>{t('collecte.duree')}</li>
          <li>{t('collecte.date')}</li>
        </ul>
        <p>{t('collecte.sansSuivi')}</p>
        <h2>{t('comment.titre')}</h2>
        <p>{t('comment.navigateur')}</p>
        <p>{t('comment.soumission')}</p>
        <h2>{t('usage.titre')}</h2>
        <p>{t('usage.texte')}</p>
        <h2>{t('reseau.titre')}</h2>
        <p>{t('reseau.texte')}</p>
        <p>{t('reseau.conservation')}</p>
        <h2>{t('contact.titre')}</h2>
        <p>
          {supportEmail ? (
            <>
              {t('contact.avant')}
              <a
                href={`mailto:${supportEmail}`}
                rel='noopener noreferrer'
                target='_blank'
              >
                {t('contact.lien')}
              </a>
              {t('contact.apres')}
            </>
          ) : (
            t('contact.sansAdresse')
          )}
        </p>
      </div>
    </article>
  );
}
