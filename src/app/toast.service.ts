import { Injectable } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: ToastItem[] = [];
  private nextId = 1;

  show(message: string, type: ToastType = 'info', ttlMs = 3200): void {
    const id = this.nextId++;
    const toast: ToastItem = { id, type, message };
    this.toasts = [...this.toasts, toast];
    if (ttlMs > 0) {
      window.setTimeout(() => this.dismiss(id), ttlMs);
    }
  }

  success(message: string, ttlMs?: number): void {
    this.show(message, 'success', ttlMs);
  }

  error(message: string, ttlMs?: number): void {
    this.show(message, 'error', ttlMs ?? 4000);
  }

  info(message: string, ttlMs?: number): void {
    this.show(message, 'info', ttlMs);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}
