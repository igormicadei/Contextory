import * as React from 'react';

export interface TileProps {
  /** @default 'base' */
  variant?: 'base' | 'clickable' | 'selectable' | 'expandable';
  selected?: boolean;
  expanded?: boolean;
  href?: string;
  /** @default false */
  disabled?: boolean;
  aboveTheFold?: React.ReactNode;
  onClick?: (expanded?: boolean) => void;
  onSelect?: (selected: boolean) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Tile(props: TileProps): JSX.Element;
