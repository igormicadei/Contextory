import * as React from 'react';

export interface ProgressBarProps {
  label?: string;
  helperText?: string;
  value?: number;
  /** @default 100 */
  max?: number;
  /** @default 'big' */
  size?: 'small' | 'big';
  /** @default 'active' */
  status?: 'active' | 'finished' | 'error';
  /** @default false */
  hideLabel?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
