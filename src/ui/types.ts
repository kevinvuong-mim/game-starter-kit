import Phaser from 'phaser';

export type UIScreenId = string;

export interface UIScreenConfig {
  id: UIScreenId;
  scene?: Phaser.Scene;
  modal?: boolean;
  data?: Record<string, unknown>;
}

export interface IUIComponent {
  readonly id: string;
  show(data?: Record<string, unknown>): void;
  hide(): void;
  destroy(): void;
  isVisible(): boolean;
}

export interface IUIScreen extends IUIComponent {
  open(data?: Record<string, unknown>): void;
  close(): void;
}

export type UIToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  type?: UIToastType;
  duration?: number;
}
