import * as React from 'react';

export interface OverflowMenuProps {
  /** @default [] */
  items?: Array<{ label: string; onClick?: () => void; disabled?: boolean; isDelete?: boolean }>;
  /** @default 'Open and close list of options' */
  ariaLabel?: string;
  /** @default false */
  flipped?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function OverflowMenu(props: OverflowMenuProps): JSX.Element;
