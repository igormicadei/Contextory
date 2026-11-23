import * as React from 'react';

export interface InlineNotificationProps {
  /** @default 'info' */
  kind?: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  subtitle?: string;
  /** @default false */
  lowContrast?: boolean;
  /** @default false */
  hideCloseButton?: boolean;
  actionLabel?: string;
  onActionClick?: () => void;
  onClose?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function InlineNotification(props: InlineNotificationProps): JSX.Element;
