import * as React from 'react';

export interface SelectProps {
  labelText?: string;
  helperText?: string;
  /** @default [] */
  items?: Array<string | { value: string; label: string }>;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  disabled?: boolean;
  /** @default false */
  invalid?: boolean;
  invalidText?: string;
  onChange?: (e) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Select(props: SelectProps): JSX.Element;
