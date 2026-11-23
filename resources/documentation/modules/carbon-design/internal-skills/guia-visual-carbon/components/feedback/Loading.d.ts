import * as React from 'react';

export interface LoadingProps {
  /** @default false */
  small?: boolean;
  /** @default false */
  withOverlay?: boolean;
  /** @default 'Loading' */
  description?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Loading(props: LoadingProps): JSX.Element;
