import * as React from 'react';

export interface FeatureCardProps {
  eyebrow?: string;
  title?: string;
  body?: string;
  icon?: React.ReactNode;
  href?: string;
  /** @default 'Learn more' */
  linkLabel?: string;
  /** @default false */
  elevated?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function FeatureCard(props: FeatureCardProps): JSX.Element;
