import * as React from 'react';

export interface CodeSnippetProps {
  /** @default 'single' */
  type?: 'single' | 'multi' | 'inline';
  /** @default 'Copied!' */
  feedback?: string;
  /** @default false */
  wrapText?: boolean;
  children?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function CodeSnippet(props: CodeSnippetProps): JSX.Element;
