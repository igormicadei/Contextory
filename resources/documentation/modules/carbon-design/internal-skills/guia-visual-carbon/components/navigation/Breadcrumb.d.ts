import * as React from 'react';

export interface BreadcrumbProps {
  /** @default [] */
  items?: Array<string | { label: string; href?: string; isCurrentPage?: boolean }>;
  /** @default true */
  noTrailingSlash?: boolean;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Breadcrumb(props: BreadcrumbProps): JSX.Element;
