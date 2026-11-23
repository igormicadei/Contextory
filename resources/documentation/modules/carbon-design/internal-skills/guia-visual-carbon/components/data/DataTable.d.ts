import * as React from 'react';

export interface DataTableProps {
  /** @default [] */
  headers?: Array<string | { key: string; header: string }>;
  /** @default [] */
  rows?: Array<Record<string, any>>;
  /** @default 'lg' */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  description?: string;
  /** @default false */
  isSortable?: boolean;
  /** @default false */
  selectable?: boolean;
  /** @default [] */
  selectedRows?: Array<string | number>;
  onSelect?: (id) => void;
  onSort?: ({ key, direction }) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function DataTable(props: DataTableProps): JSX.Element;
