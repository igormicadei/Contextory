import * as React from 'react';

export interface RadioButtonProps {
  name?: string;
  value?: string;
  labelText?: string;
  checked?: boolean;
  /** @default false */
  disabled?: boolean;
  onChange?: (e) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function RadioButton(props: RadioButtonProps): JSX.Element;
