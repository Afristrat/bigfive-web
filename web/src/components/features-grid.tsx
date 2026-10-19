'use client';

import React, { ReactNode } from 'react';
import { tv } from 'tailwind-variants';
import { Card, CardHeader, CardBody, SlotsToClasses } from '@nextui-org/react';

const styles = tv({
  slots: {
    base: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    card: 'border-transparent bg-white/5 dark:bg-default-400/10 backdrop-blur-lg backdrop-saturate-[1.8]',
    header: 'gap-2 pb-0',
    body: '',
    iconWrapper:
      'flex justify-center p-2 rounded-full items-center bg-secondary-100/80 text-pink-500',
    title: 'text-base font-semibold',
    description: 'font-normal text-base text-default-500'
  }
});

export type FeaturesGridSlots = keyof ReturnType<typeof styles>;

export interface Feature {
  title: string;
  icon: ReactNode;
  description?: string;
}

interface FeaturesGridProps {
  features: Feature[];
  classNames?: SlotsToClasses<FeaturesGridSlots>;
}

export const FeaturesGrid = ({
  features,
  classNames,
  ...props
}: FeaturesGridProps) => {
  const slots = styles();

  return (
    <div className={slots.base({ class: classNames?.base })} {...props}>
      {features.map((feat: Feature, index: number) => (
        <Card
          key={`${feat.title}_${index}`}
          isBlurred
          className={slots.card({ class: classNames?.card })}
        >
          <CardHeader className={slots.header({ class: classNames?.header })}>
            <div
              aria-hidden="true"
              className={slots.iconWrapper({ class: classNames?.iconWrapper })}
            >
              {feat.icon}
            </div>
            <h3 className={slots.title({ class: classNames?.title })}>
              {feat.title}
            </h3>
          </CardHeader>
          {feat.description ? (
            <CardBody className={slots.body({ class: classNames?.body })}>
              <p
                className={slots.description({
                  class: classNames?.description
                })}
              >
                {feat.description}
              </p>
            </CardBody>
          ) : null}
        </Card>
      ))}
    </div>
  );
};
