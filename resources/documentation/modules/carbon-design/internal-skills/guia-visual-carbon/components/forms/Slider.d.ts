import * as React from 'react';

export interface SliderProps {
  labelText?: string;
  value?: number;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  /** @default false */
  disabled?: boolean;
  /** @default false */
  hideTextInput?: boolean;
  onChange?: ({ value }) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Slider(props: SliderProps): JSX.Element;
