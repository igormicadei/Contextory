import * as React from 'react';

export interface PaginationProps {
  /** @default 1 */
  page?: number;
  /** @default 10 */
  pageSize?: number;
  /** @default 0 */
  totalItems?: number;
  /** @default [10, 20, 30, 40, 50] */
  pageSizes?: number[];
  onChange?: ({ page, pageSize }) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Pagination(props: PaginationProps): JSX.Element;
