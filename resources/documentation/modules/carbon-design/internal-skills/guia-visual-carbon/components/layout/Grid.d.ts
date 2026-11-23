import * as React from 'react';

export interface GridProps {
  /** @default false */
  condensed?: boolean;
  /** @default false */
  narrow?: boolean;
  /** @default false */
  fullWidth?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Grid(props: GridProps): JSX.Element;

export interface ColumnProps {
  /** Columns to span at the sm tier (4-column grid). @default 4 */
  sm?: number;
  /** Columns to span at the md tier (8-column grid). @default 8 */
  md?: number;
  /** Columns to span at the lg tier (16-column grid). @default 16 */
  lg?: number;
  /** Columns to span at the xlg tier (16-column grid). */
  xlg?: number;
  /** Columns to span at the max tier (16-column grid). */
  max?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Column(props: ColumnProps): JSX.Element;
