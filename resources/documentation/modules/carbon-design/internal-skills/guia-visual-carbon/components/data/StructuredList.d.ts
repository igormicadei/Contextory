import * as React from 'react';

export interface StructuredListProps {
  /** @default [] */
  headers?: string[];
  /** @default [] */
  rows?: Array<string[] | Record<string, any>>;
  /** @default false */
  selection?: boolean;
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function StructuredList(props: StructuredListProps): JSX.Element;
