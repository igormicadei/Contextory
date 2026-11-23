import * as React from 'react';

export interface TagProps {
  /** @default 'gray' */
  type?: 'red' | 'magenta' | 'purple' | 'blue' | 'cyan' | 'teal' | 'green' | 'gray' | 'cool-gray' | 'warm-gray' | 'high-contrast' | 'outline';
  /** @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** @default false */
  filter?: boolean;
  /** @default false */
  disabled?: boolean;
  onClose?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Tag(props: TagProps): JSX.Element;
