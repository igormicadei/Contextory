import * as React from 'react';

export interface TextInputProps {
  labelText?: string;
  helperText?: string;
  placeholder?: string;
  value?: string;
  /** @default 'text' */
  type?: string;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  disabled?: boolean;
  /** @default false */
  readOnly?: boolean;
  /** @default false */
  invalid?: boolean;
  invalidText?: string;
  /** @default false */
  warn?: boolean;
  warnText?: string;
  /** @default false */
  light?: boolean;
  onChange?: (e) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function TextInput(props: TextInputProps): JSX.Element;
