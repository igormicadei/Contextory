import * as React from 'react';

export interface FooterProps {
  /** @default [] */
  columns?: Array<{ title: string; links: Array<{ label: string; href?: string }> }>;
  /** @default 'IBM' */
  wordmark?: string;
  /** @default [] */
  legalLinks?: Array<{ label: string; href?: string }>;
  copyright?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Footer(props: FooterProps): JSX.Element;
