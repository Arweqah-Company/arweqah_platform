/**
 * The four kinds of message, one color each, used by alerts, toasts and badges alike:
 * information blue, warning yellow, error red, success green.
 * Each carries an icon and a start rule, so the meaning never rests on color alone; the text stays dark
 * (yellow and green are never text on a light surface).
 */
export type MessageTone = 'info' | 'warning' | 'danger' | 'success';

export const MESSAGE_TONES: Record<MessageTone, { box: string; icon: string; toast: string }> = {
  info: { box: 'border-petrol-800 bg-petrol-50 text-fg', icon: 'text-link', toast: 'border-petrol-800 bg-petrol-50 [&_[data-icon]]:text-link' },
  warning: { box: 'border-yellow-300 bg-yellow-50 text-fg', icon: 'text-fg', toast: 'border-yellow-300 bg-yellow-50 [&_[data-icon]]:text-fg' },
  danger: { box: 'border-danger-700 bg-danger-50 text-fg', icon: 'text-danger-text', toast: 'border-danger-700 bg-danger-50 [&_[data-icon]]:text-danger-text' },
  success: { box: 'border-green-400 bg-green-50 text-fg', icon: 'text-success', toast: 'border-green-400 bg-green-50 [&_[data-icon]]:text-success' },
};
