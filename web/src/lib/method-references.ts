// Références de la page « Méthode et références ». Données neutres : auteurs,
// année, revue, DOI, mode de lecture. Les textes (ce que la source établit, ses
// limites, le niveau de preuve) vivent dans les messages, sous « method.refs ».
// Chaque entrée correspond à une fiche de docs/design/dossier-preuves.md (champ
// « fiche »). Seules les fiches « preuve forte » ou « preuve partielle » y sont.

export type ReadingMode = 'full' | 'abstract' | 'web';

export type MethodReference = {
  id: string;
  fiche: string;
  authors: string;
  /** Absent pour une page web, consultée à la date indiquée sur la page. */
  year: number | null;
  /** Revue ou site, avec volume et pages quand le dossier les donne. */
  venue: string;
  /** Adresse du DOI ou de la page. */
  url: string;
  /** Libellé court du lien (DOI ou adresse). */
  linkLabel: string;
  reading: ReadingMode;
};

const doi = (
  identifier: string
): Pick<MethodReference, 'url' | 'linkLabel'> => ({
  url: `https://doi.org/${identifier}`,
  linkLabel: `doi:${identifier}`
});

export const methodReferences: readonly MethodReference[] = [
  {
    id: 'johnson2014',
    fiche: 'P34',
    authors: 'J. A. Johnson',
    year: 2014,
    venue: 'Journal of Research in Personality, 51, 78-89',
    ...doi('10.1016/j.jrp.2014.05.003'),
    reading: 'full'
  },
  {
    id: 'kajonius2019',
    fiche: 'P35',
    authors: 'P. Kajonius, J. A. Johnson',
    year: 2019,
    venue: 'Europe’s Journal of Psychology',
    ...doi('10.5964/ejop.v15i2.1671'),
    reading: 'abstract'
  },
  {
    id: 'ipip',
    fiche: 'P33 bis',
    authors: 'International Personality Item Pool',
    year: null,
    venue: 'ipip.ori.org',
    url: 'https://ipip.ori.org/',
    linkLabel: 'ipip.ori.org',
    reading: 'web'
  },
  {
    id: 'mccrae2005',
    fiche: 'P26',
    authors: 'R. R. McCrae, A. Terracciano et al.',
    year: 2005,
    venue: 'Journal of Personality and Social Psychology, 88(3)',
    ...doi('10.1037/0022-3514.88.3.547'),
    reading: 'abstract'
  },
  {
    id: 'schmitt2007',
    fiche: 'P28',
    authors: 'D. P. Schmitt, J. Allik, R. R. McCrae, V. Benet-Martínez',
    year: 2007,
    venue: 'Journal of Cross-Cultural Psychology',
    ...doi('10.1177/0022022106297299'),
    reading: 'abstract'
  },
  {
    id: 'sackett2022',
    fiche: 'P1',
    authors: 'P. R. Sackett, C. Zhang, C. M. Berry, F. Lievens',
    year: 2022,
    venue: 'Journal of Applied Psychology, 107(11), 2040-2068',
    ...doi('10.1037/apl0000994'),
    reading: 'full'
  },
  {
    id: 'judge2013',
    fiche: 'P4',
    authors:
      'T. A. Judge, J. B. Rodell, R. L. Klinger, L. S. Simon, E. R. Crawford',
    year: 2013,
    venue: 'Journal of Applied Psychology, 98(6), 875-925',
    ...doi('10.1037/a0033901'),
    reading: 'abstract'
  },
  {
    id: 'barrick2001',
    fiche: 'P2',
    authors: 'M. R. Barrick, M. K. Mount, T. A. Judge',
    year: 2001,
    venue: 'International Journal of Selection and Assessment, 9, 9-30',
    ...doi('10.1111/1468-2389.00160'),
    reading: 'abstract'
  },
  {
    id: 'judge2002',
    fiche: 'P15',
    authors: 'T. A. Judge, J. E. Bono, R. Ilies, M. W. Gerhardt',
    year: 2002,
    venue: 'Journal of Applied Psychology, 87(4), 765-780',
    ...doi('10.1037/0021-9010.87.4.765'),
    reading: 'abstract'
  },
  {
    id: 'peeters2006',
    fiche: 'P12',
    authors:
      'M. A. G. Peeters, H. F. J. M. van Tuijl, C. G. Rutte, I. M. M. J. Reymen',
    year: 2006,
    venue: 'European Journal of Personality',
    ...doi('10.1002/per.588'),
    reading: 'abstract'
  },
  {
    id: 'bell2007',
    fiche: 'P11',
    authors: 'S. T. Bell',
    year: 2007,
    venue: 'Journal of Applied Psychology, 92(3), 595-615',
    ...doi('10.1037/0021-9010.92.3.595'),
    reading: 'abstract'
  },
  {
    id: 'birkeland2006',
    fiche: 'P9',
    authors:
      'S. A. Birkeland, T. M. Manson, J. L. Kisamore, M. T. Brannick, M. A. Smith',
    year: 2006,
    venue: 'International Journal of Selection and Assessment',
    ...doi('10.1111/j.1468-2389.2006.00354.x'),
    reading: 'abstract'
  },
  {
    id: 'morgeson2007',
    fiche: 'P7',
    authors:
      'F. P. Morgeson, M. A. Campion, R. L. Dipboye, J. R. Hollenbeck, K. R. Murphy, N. Schmitt',
    year: 2007,
    venue: 'Personnel Psychology',
    ...doi('10.1111/j.1744-6570.2007.00089.x'),
    reading: 'abstract'
  },
  {
    id: 'ones2007',
    fiche: 'P8',
    authors: 'D. S. Ones, S. Dilchert, C. Viswesvaran, T. A. Judge',
    year: 2007,
    venue: 'Personnel Psychology',
    ...doi('10.1111/j.1744-6570.2007.00099.x'),
    reading: 'abstract'
  },
  {
    id: 'kluger1996',
    fiche: 'P18',
    authors: 'A. N. Kluger, A. DeNisi',
    year: 1996,
    venue: 'Psychological Bulletin',
    ...doi('10.1037/0033-2909.119.2.254'),
    reading: 'abstract'
  },
  {
    id: 'chraibi2025',
    fiche: 'P30',
    authors: 'K. Chraibi, M. Lamouine, I. Chaker, A. Zahi',
    year: 2025,
    venue: 'Psychological-Educational Studies',
    ...doi('10.17759/psyedu.2025170203'),
    reading: 'abstract'
  }
];

export type MethodGroupId =
  | 'instrument'
  | 'culture'
  | 'work'
  | 'teams'
  | 'selection'
  | 'feedback'
  | 'morocco';

// Ordre d'affichage de la page : l'instrument d'abord, puis la recherche.
export const methodGroups: readonly {
  id: MethodGroupId;
  refs: readonly string[];
}[] = [
  { id: 'instrument', refs: ['johnson2014', 'kajonius2019', 'ipip'] },
  { id: 'culture', refs: ['mccrae2005', 'schmitt2007'] },
  { id: 'work', refs: ['sackett2022', 'judge2013', 'barrick2001'] },
  { id: 'teams', refs: ['judge2002', 'peeters2006', 'bell2007'] },
  { id: 'selection', refs: ['birkeland2006', 'morgeson2007', 'ones2007'] },
  { id: 'feedback', refs: ['kluger1996'] },
  { id: 'morocco', refs: ['chraibi2025'] }
];

export const methodReferenceById = (id: string): MethodReference => {
  const found = methodReferences.find((reference) => reference.id === id);
  if (!found) throw new RangeError(`Référence inconnue : ${id}`);
  return found;
};
