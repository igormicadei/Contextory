import * as React from 'react';

export interface InlineLoadingProps {
  /** @default 'active' */
  status?: 'active' | 'inactive' | 'finished' | 'error';
  /** @default 'Loading…' */
  description?: string;
  iconDescription?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function InlineLoading(props: InlineLoadingProps): JSX.Element;
