import * as React from 'react';

export interface FileUploaderProps {
  /** @default 'Upload files' */
  labelTitle?: string;
  labelDescription?: string;
  /** @default 'Add file' */
  buttonLabel?: string;
  accept?: string;
  /** @default false */
  multiple?: boolean;
  /** @default false */
  disabled?: boolean;
  /** @default [] */
  files?: Array<File | string>;
  onAdd?: (files: File[]) => void;
  onDelete?: (index: number) => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function FileUploader(props: FileUploaderProps): JSX.Element;
