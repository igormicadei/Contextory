import * as React from 'react';

export interface DropdownProps {
  titleText?: string;
  /** @default 'Choose an option' */
  label?: string;
  helperText?: string;
  /** @default [] */
  items?: Array<string | { label: string }>;
  selectedItem?: any;
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  disabled?: boolean;
  /** @default false */
  invalid?: boolean;
  invalidText?: string;
  onChange?: ({ selectedItem }) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Dropdown(props: DropdownProps): JSX.Element;
