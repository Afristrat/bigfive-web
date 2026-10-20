import { getTranslations } from 'next-intl/server';

// Squelette de la vue d'ensemble : géométrie exacte des règles, sans
// scintillement quand le mouvement est réduit.
const rangees = ['N', 'E', 'O', 'A', 'C'];

export default async function Loading() {
  const t = await getTranslations('results');
  return (
    <>
      <p role='status' className='sr-only'>
        {t('loading')}
      </p>
      <div aria-hidden='true' className='motion-safe:animate-pulse'>
        <div className='h-9 w-72 max-w-full rounded-controle bg-creux' />
        <div className='mt-3 h-4 w-40 rounded-petit bg-creux' />
        <div className='mt-12 h-6 w-56 rounded-petit bg-creux' />
        <ul className='mt-6 flex flex-col gap-5'>
          {rangees.map((code) => (
            <li
              key={code}
              className='grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(8rem,14rem)_1fr_auto]'
            >
              <span className='h-4 w-32 rounded-petit bg-creux' />
              <span className='col-span-2 h-2 rounded-petit bg-creux sm:col-span-1 sm:col-start-2 sm:row-start-1' />
              <span className='col-start-2 row-start-1 h-4 w-24 rounded-petit bg-creux sm:col-start-3' />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
