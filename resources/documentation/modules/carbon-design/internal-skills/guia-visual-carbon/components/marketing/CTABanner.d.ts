import * as React from 'react';

export interface CTABannerProps {
  title?: string;
  body?: string;
  actions?: React.ReactNode;
  /** @default 'blue' */
  tone?: 'blue' | 'dark' | 'subtle';
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function CTABanner(props: CTABannerProps): JSX.Element;
