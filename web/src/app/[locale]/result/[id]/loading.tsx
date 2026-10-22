import { getTranslations } from 'next-intl/server';

// Squelette de la page de résultat : même géométrie (titre, carte du radar,
// carte des cinq domaines), sans scintillement quand le mouvement est réduit.
const rangees = ['N', 'E', 'O', 'A', 'C'];
const carte = 'carte';

export default async function Loading() {
  const t = await getTranslations('results');
  return (
    <>
      <p role='status' className='sr-only'>
        {t('loading')}
      </p>
      <div aria-hidden='true' className='motion-safe:animate-pulse'>
        <div className='h-10 w-full max-w-xl rounded-controle bg-creux' />
        <div className='mt-3 h-4 w-32 rounded-petit bg-creux' />
        <div className='mt-4 h-5 w-full max-w-md rounded-petit bg-creux' />
        <div className='mt-8 grid gap-4 lg:grid-cols-[11fr_10fr]'>
          <div className={carte}>
            <div className='h-7 w-56 rounded-petit bg-creux' />
            <div className='mx-auto mt-6 h-72 w-72 max-w-full rounded-full bg-creux' />
          </div>
          <div className={carte}>
            <ul className='flex flex-col gap-7'>
              {rangees.map((code) => (
                <li key={code}>
                  <div className='flex items-center gap-3'>
                    <span className='h-5 w-32 rounded-petit bg-creux' />
                    <span className='ms-auto h-7 w-20 rounded-petit bg-creux' />
                  </div>
                  <span className='mt-3 block h-2 rounded-petit bg-creux' />
                  <span className='mt-3 block h-4 w-3/4 rounded-petit bg-creux' />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
