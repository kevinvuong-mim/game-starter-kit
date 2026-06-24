export type UIScreenId = string;

export interface IUIComponent {
  hide(): void;
  destroy(): void;
  readonly id: string;
  isVisible(): boolean;
  show(data?: Record<string, unknown>): void;
}

export interface IUIScreen extends IUIComponent {
  close(): void;
  open(data?: Record<string, unknown>): void;
}

export type UIToastType = 'info' | 'error' | 'success' | 'warning';

export type ToastPosition = 'top' | 'bottom';

export interface ToastOffset {
  x?: number;
  y?: number;
}

export interface ToastOptions {
  message: string;
  duration?: number;
  type?: UIToastType;
  position?: ToastPosition;
  offset?: ToastOffset;
}
