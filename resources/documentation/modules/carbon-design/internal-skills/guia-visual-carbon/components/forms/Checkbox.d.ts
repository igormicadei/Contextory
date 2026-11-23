import * as React from 'react';

export interface CheckboxProps {
  labelText?: string;
  checked?: boolean;
  /** @default false */
  defaultChecked?: boolean;
  /** @default false */
  indeterminate?: boolean;
  /** @default false */
  disabled?: boolean;
  /** @default false */
  invalid?: boolean;
  invalidText?: string;
  onChange?: (e) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Checkbox(props: CheckboxProps): JSX.Element;
