import * as React from 'react';

export interface ModalProps {
  /** @default false */
  open?: boolean;
  modalHeading?: string;
  modalLabel?: string;
  /** @default 'md' */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** @default false */
  danger?: boolean;
  /** @default 'Save' */
  primaryButtonText?: string;
  /** @default 'Cancel' */
  secondaryButtonText?: string;
  /** @default false */
  primaryButtonDisabled?: boolean;
  /** @default false */
  passiveModal?: boolean;
  onRequestClose?: () => void;
  onRequestSubmit?: () => void;
  onSecondarySubmit?: () => void;
  style?: React.CSSProperties;
  [key: string]: any;
}

export declare function Modal(props: ModalProps): JSX.Element;
