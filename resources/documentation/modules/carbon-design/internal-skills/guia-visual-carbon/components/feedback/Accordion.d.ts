import * as React from 'react';

export interface AccordionProps {
  /** @default [] */
  items?: Array<{ title: string; content: React.ReactNode; open?: boolean; disabled?: boolean }>;
  /** @default 'end' */
  align?: 'start' | 'end';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Accordion(props: AccordionProps): JSX.Element;
