import * as React from 'react';

export interface HeroBandProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  media?: React.ReactNode;
  /** @default 'white' */
  theme?: 'white' | 'g10' | 'g90' | 'g100';
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function HeroBand(props: HeroBandProps): JSX.Element;
