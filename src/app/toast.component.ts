import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" *ngIf="toastService.toasts.length">
      <div class="toast" *ngFor="let toast of toastService.toasts" [class]="toast.type">
        <span>{{ toast.message }}</span>
        <button type="button" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">×</button>
      </div>
    </div>
  `,
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
