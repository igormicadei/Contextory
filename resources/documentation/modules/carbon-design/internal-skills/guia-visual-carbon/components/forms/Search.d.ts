import * as React from 'react';

export interface SearchProps {
  /** @default 'Search' */
  labelText?: string;
  /** @default 'Search' */
  placeholder?: string;
  /** @default 'lg' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  disabled?: boolean;
  onChange?: (e) => void;
  onClear?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Search(props: SearchProps): JSX.Element;
