'use client';

import { Button, Tooltip, useDisclosure } from '@nextui-org/react';
import { Link as NextUiLink } from '@nextui-org/link';
import {
  CopyIcon,
  FacebookIcon,
  MailIcon,
  PDFIcon,
  TwitterIcon
} from './icons';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { EmailModal } from './email-modal';

export type ShareBarLabels = {
  facebook: string;
  x: string;
  print: string;
  mail: string;
  copy: string;
};

interface ShareBarButtonsProps {
  link: string;
  description: string;
  labels: ShareBarLabels;
  // Identifiant du résultat : l'envoi par e-mail n'existe que pour un résultat.
  resultId?: string;
}

const iconButton = 'text-texte-2 data-[hover=true]:bg-creux';

export function ShareBarButtons({
  link,
  description,
  labels,
  resultId
}: ShareBarButtonsProps) {
  const [, copy] = useCopyToClipboard();
  const disclosure = useDisclosure();

  return (
    <>
      <Tooltip content={labels.facebook}>
        <Button
          isIconOnly
          aria-label={labels.facebook}
          size='md'
          variant='light'
          className={iconButton}
          as={NextUiLink}
          isExternal
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
        >
          <FacebookIcon />
        </Button>
      </Tooltip>
      <Tooltip content={labels.x}>
        <Button
          isIconOnly
          aria-label={labels.x}
          size='md'
          variant='light'
          className={iconButton}
          as={NextUiLink}
          isExternal
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(description)}&url=${encodeURIComponent(link)}`}
        >
          <TwitterIcon />
        </Button>
      </Tooltip>
      <Tooltip content={labels.print}>
        <Button
          isIconOnly
          aria-label={labels.print}
          size='md'
          variant='light'
          className={iconButton}
          onPress={() => window.print()}
        >
          <PDFIcon />
        </Button>
      </Tooltip>
      {resultId && (
        <Tooltip content={labels.mail}>
          <Button
            isIconOnly
            aria-label={labels.mail}
            size='md'
            variant='light'
            className={iconButton}
            onPress={disclosure.onOpen}
          >
            <MailIcon />
          </Button>
        </Tooltip>
      )}
      <Tooltip content={labels.copy}>
        <Button
          isIconOnly
          aria-label={labels.copy}
          size='md'
          variant='light'
          className={iconButton}
          onPress={() => copy(link)}
        >
          <CopyIcon />
        </Button>
      </Tooltip>
      {resultId && <EmailModal disclosure={disclosure} resultId={resultId} />}
    </>
  );
}
