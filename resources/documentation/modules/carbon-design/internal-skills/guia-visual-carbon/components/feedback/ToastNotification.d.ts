import * as React from 'react';

export interface ToastNotificationProps {
  /** @default 'info' */
  kind?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  subtitle?: string;
  caption?: string;
  /** @default false */
  lowContrast?: boolean;
  /** @default false */
  hideCloseButton?: boolean;
  onClose?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function ToastNotification(props: ToastNotificationProps): JSX.Element;
