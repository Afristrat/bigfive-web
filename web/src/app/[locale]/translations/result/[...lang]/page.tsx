'use client';

import { getTemplate } from '@bigfive-org/results';
import { Card, CardBody, CardHeader } from '@nextui-org/card';
import { Input, Textarea } from '@nextui-org/input';
import { subtitle, title } from '@/components/primitives';
import { TranslationState, generateResultTextTranslation } from '@/actions';
import { use, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { supportEmail } from '@/config/site';
import type { ResultTemplateDomain } from '@/types';
import { Button } from '@nextui-org/button';
import { Chip } from '@nextui-org/react';

interface TranslationResultProps {
  params: Promise<{
    lang: string[];
  }>;
}
export default function TranslationResult({
  params
}: TranslationResultProps) {
  const { lang } = use(params);
  const template: ResultTemplateDomain[] = getTemplate(lang[0]);
  const [state, formAction] = useActionState(generateResultTextTranslation, {
    message: '',
    type: 'success'
  } as TranslationState);
  return (
    <form action={formAction}>
      <div className='gap-4 flex flex-col'>
        <h1 className={title()}>Translation</h1>
        <h2 className={subtitle()}>
          Translation of the results page. The translation will be saved in the
          database and manually reviewed.
          {supportEmail && (
            <>
              {' '}
              If you have any questions, please contact us at{' '}
              <a href={`mailto:${supportEmail}`} className='underline'>
                {supportEmail}
              </a>
            </>
          )}
        </h2>

        {template.map((item) => {
          return (
            <Card key={item.domain}>
              <CardHeader>
                <h1 className='text-large font-bold'>{item.title}</h1>
              </CardHeader>
              <CardBody className='gap-4'>
                <Input
                  defaultValue={item.title}
                  name={`${item.domain}.title`}
                  label='Domain'
                />
                <Input
                  defaultValue={item.shortDescription}
                  label='Short Domain description'
                  name={`${item.domain}.shortDescription`}
                />
                <Textarea
                  defaultValue={item.description}
                  label='Domain description'
                  name={`${item.domain}.description`}
                />
                {item.results.map((result, i) => {
                  return (
                    <div key={`${item.domain}-${result.score}`}>
                      <Input
                        defaultValue={result.text}
                        label={`Result text (${result.score})`}
                        name={`${item.domain}.results[${i}].text`}
                      />
                      <Input
                        className='hidden'
                        hidden
                        defaultValue={result.score}
                        label='score'
                        name={`${item.domain}.results[${i}].score`}
                      />
                    </div>
                  );
                })}
                {item.facets.map((facet, i) => {
                  return (
                    <div
                      key={`${item.domain}-${facet.facet}`}
                      className='flex flex-col gap-4'
                    >
                      <h2 className='text-large font-medium'>{facet.title}</h2>
                      <Input
                        defaultValue={facet.title}
                        label='Facet title'
                        name={`${item.domain}.facets[${i}].title`}
                      />
                      <Textarea
                        defaultValue={facet.text}
                        label='Facet text'
                        name={`${item.domain}.facets[${i}].text`}
                      />
                      <Input
                        className='hidden'
                        hidden
                        defaultValue={String(facet.facet)}
                        label='facet'
                        name={`${item.domain}.facets[${i}].facet`}
                      />
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          );
        })}
      </div>
      <SubmitButton />
      {state.message && (
        <div className='flex mt-4 justify-center'>
          <Chip
            color={state.type === 'success' ? 'success' : 'danger'}
            size='lg'
            variant='flat'
          >
            <p>{state.message}</p>
          </Chip>
        </div>
      )}
    </form>
  );
}

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <div className='flex justify-end mt-8'>
      <Button color='primary' type='submit' isLoading={pending}>
        Generate translation
      </Button>
    </div>
  );
};
