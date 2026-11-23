import * as React from 'react';

export interface TooltipProps {
  label?: string;
  /** @default 'top' */
  align?: 'top' | 'bottom' | 'left' | 'right';
  /** @default false */
  defaultOpen?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Tooltip(props: TooltipProps): JSX.Element;
