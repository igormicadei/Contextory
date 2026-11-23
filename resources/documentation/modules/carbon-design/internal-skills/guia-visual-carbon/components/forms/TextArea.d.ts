import * as React from 'react';

export interface TextAreaProps {
  labelText?: string;
  helperText?: string;
  placeholder?: string;
  /** @default 4 */
  rows?: number;
  maxCount?: number;
  /** @default false */
  disabled?: boolean;
  /** @default false */
  invalid?: boolean;
  invalidText?: string;
  onChange?: (e) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function TextArea(props: TextAreaProps): JSX.Element;
