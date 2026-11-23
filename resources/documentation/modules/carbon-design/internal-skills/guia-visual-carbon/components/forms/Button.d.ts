import * as React from 'react';

export interface ButtonProps {
  /** @default 'primary' */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'danger--tertiary' | 'danger--ghost';
  /** @default 'lg' */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** @default false */
  disabled?: boolean;
  /** @default false */
  isSelected?: boolean;
  /** @default false */
  hasIconOnly?: boolean;
  renderIcon?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Button(props: ButtonProps): JSX.Element;
