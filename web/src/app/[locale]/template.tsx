import { ReactElement, ReactNode } from 'react';

// Transition de page : le gabarit est remonté à chaque navigation, son contenu
// entre en douceur (opacité et léger décalage, 420 ms). Rien sous « réduire les
// animations ».
export default function Template({
  children
}: {
  children: ReactNode;
}): ReactElement {
  return <div className='entree-page'>{children}</div>;
}
