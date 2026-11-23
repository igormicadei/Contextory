import * as React from 'react';

export interface LinkProps {
  /** @default '#' */
  href?: string;
  /** @default false */
  inline?: boolean;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  disabled?: boolean;
  /** @default false */
  visited?: boolean;
  renderIcon?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Link(props: LinkProps): JSX.Element;
