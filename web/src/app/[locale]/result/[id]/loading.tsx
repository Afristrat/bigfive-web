import { getTranslations } from 'next-intl/server';

// Squelette de la page de résultat : même géométrie (surtitre, titre de
// titrage, planche du radar, fiche des cinq domaines), sans scintillement quand
// le mouvement est réduit.
const rangees = ['N', 'E', 'O', 'A', 'C'];

export default async function Loading() {
  const t = await getTranslations('results');
  return (
    <>
      <p role='status' className='sr-only'>
        {t('loading')}
      </p>
      <div aria-hidden='true' className='motion-safe:animate-pulse'>
        <div className='h-4 w-48 rounded-petit bg-creux' />
        <div className='mt-6 h-14 w-full max-w-2xl rounded-controle bg-creux' />
        <div className='mt-3 h-14 w-2/3 max-w-xl rounded-controle bg-creux' />
        <div className='mt-8 h-5 w-full max-w-lg rounded-petit bg-creux' />
        <div className='mt-14 grid gap-x-12 gap-y-14 lg:grid-cols-12'>
          <div className='lg:col-span-6'>
            <div className='h-7 w-56 rounded-petit bg-creux' />
            <div className='mx-auto mt-8 aspect-square w-full max-w-[420px] rounded-full bg-creux' />
          </div>
          <ul className='flex flex-col border-t-2 border-creux lg:col-span-6'>
            {rangees.map((code) => (
              <li key={code} className='border-b border-creux py-5'>
                <div className='flex items-end gap-4'>
                  <span className='h-6 w-36 rounded-petit bg-creux' />
                  <span className='ms-auto h-10 w-24 rounded-petit bg-creux' />
                </div>
                <span className='mt-4 block h-2 rounded-full bg-creux' />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
