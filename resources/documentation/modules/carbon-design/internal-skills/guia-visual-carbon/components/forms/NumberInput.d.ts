import * as React from 'react';

export interface NumberInputProps {
  label?: string;
  helperText?: string;
  value?: number;
  min?: number;
  max?: number;
  /** @default 1 */
  step?: number;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  disabled?: boolean;
  /** @default false */
  invalid?: boolean;
  invalidText?: string;
  onChange?: (value: number) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function NumberInput(props: NumberInputProps): JSX.Element;
