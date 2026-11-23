import * as React from 'react';

export interface TabsProps {
  /** @default [] */
  tabs?: Array<string | { label: string; disabled?: boolean }>;
  selectedIndex?: number;
  /** @default 0 */
  defaultSelectedIndex?: number;
  /** @default false */
  contained?: boolean;
  onChange?: ({ selectedIndex }) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Tabs(props: TabsProps): JSX.Element;
