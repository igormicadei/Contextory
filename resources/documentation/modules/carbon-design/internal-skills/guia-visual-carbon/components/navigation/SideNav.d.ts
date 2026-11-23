import * as React from 'react';

export interface SideNavProps {
  /** @default [] */
  items?: Array<{ label: string; href?: string; icon?: React.ReactNode; isActive?: boolean; items?: Array<object> }>;
  /** @default true */
  expanded?: boolean;
  /** @default 'Side navigation' */
  ariaLabel?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function SideNav(props: SideNavProps): JSX.Element;
