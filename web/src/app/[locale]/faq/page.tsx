'use client';
import { title } from '@/components/primitives';
import { Accordion, AccordionItem } from '@nextui-org/accordion';
import { supportEmail } from '@/config/site';

export default function FaqPage() {
  const faq = [
    ...(supportEmail
      ? [
          {
            question: 'I got an error on this website',
            answer: `Tell us what happened by e-mail at ${supportEmail}.`
          }
        ]
      : []),
    {
      question: 'How do I print my test results?',
      answer:
        'Try to print the results-page from your browser or save it as a PDF-document and print that instead.'
    },
    {
      question:
        'Where can I find more information about the questions and the evaluation?',
      answer: 'See the IPIP Website for more information.'
    },
    {
      question: 'Where do the questions come from?',
      answer:
        'The questions and the scoring are taken from the public domain International Personality Item Pool (ipip.ori.org).'
    }
  ];
  return (
    <div>
      <h1 className={title()}>Frequently asked questions.</h1>
      <Accordion className='mt-10'>
        {faq.map((item, index) => (
          <AccordionItem
            key={index}
            textValue={item.question}
            title={
              <span className='text-foreground text-large font-medium'>
                {item.question}
              </span>
            }
          >
            <div className='py-2 pt-0 pb-6 text-base text-default-500'>
              {item.answer}
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
