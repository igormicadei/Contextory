import * as React from 'react';

export interface ProgressIndicatorProps {
  /** @default [] */
  steps?: Array<string | { label: string; secondaryLabel?: string; invalid?: boolean }>;
  /** @default 0 */
  currentIndex?: number;
  /** @default false */
  vertical?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function ProgressIndicator(props: ProgressIndicatorProps): JSX.Element;
