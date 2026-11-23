import * as React from 'react';

export interface ToggleProps {
  labelText?: string;
  /** @default 'Off' */
  labelA?: string;
  /** @default 'On' */
  labelB?: string;
  /** @default false */
  hideLabel?: boolean;
  toggled?: boolean;
  /** @default false */
  defaultToggled?: boolean;
  /** @default 'md' */
  size?: 'sm' | 'md';
  /** @default false */
  disabled?: boolean;
  onToggle?: (on: boolean) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Toggle(props: ToggleProps): JSX.Element;
