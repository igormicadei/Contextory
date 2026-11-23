import * as React from 'react';

export interface UIShellHeaderProps {
  /** @default 'IBM' */
  prefix?: string;
  /** @default 'Product' */
  name?: string;
  /** @default [] */
  navItems?: Array<{ label: string; href?: string; isActive?: boolean }>;
  /** @default [] */
  actions?: Array<{ label: string; icon: React.ReactNode; onClick?: () => void; isActive?: boolean }>;
  onMenuClick?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function UIShellHeader(props: UIShellHeaderProps): JSX.Element;
