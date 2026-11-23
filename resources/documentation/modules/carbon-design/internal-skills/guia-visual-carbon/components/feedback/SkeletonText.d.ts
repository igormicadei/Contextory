import * as React from 'react';

export interface SkeletonTextProps {
  /** @default false */
  heading?: boolean;
  /** @default false */
  paragraph?: boolean;
  /** @default 3 */
  lineCount?: number;
  /** @default '100%' */
  width?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function SkeletonText(props: SkeletonTextProps): JSX.Element;
