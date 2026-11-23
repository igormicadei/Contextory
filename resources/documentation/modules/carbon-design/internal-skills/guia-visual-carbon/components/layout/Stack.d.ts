import * as React from 'react';

export interface StackProps {
  /** @default 'vertical' */
  orientation?: 'vertical' | 'horizontal';
  /** @default 5 */
  gap?: number | string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Stack(props: StackProps): JSX.Element;

export interface AspectRatioProps {
  /** Ratio as "WxH". @default '16x9' */
  ratio?: '16x9' | '9x16' | '2x1' | '1x2' | '4x3' | '3x4' | '1x1' | string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function AspectRatio(props: AspectRatioProps): JSX.Element;
