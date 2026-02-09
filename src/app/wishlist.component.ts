import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { WishlistRequest } from './models';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './wishlist.component.html',
  styleUrl: './wishlist.component.css'
})
export class WishlistComponent {
  wishlist: WishlistRequest = {
    customerName: '',
    customerPhone: '',
    whatsappNumber: '',
    desiredItems: '',
    notes: ''
  };
  usePhoneForWhatsapp = true;
  wishlistMessage = '';
  wishlistSubmitting = false;

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  submitWishlist(): void {
    this.wishlistMessage = '';
    this.wishlistSubmitting = true;
    this.syncWhatsappFromPhone();

    this.api.createWishlist(this.wishlist).subscribe({
      next: () => {
        this.wishlistMessage = 'Request sent. We will contact you to confirm.';
        this.toast.success('Wish list sent successfully.');
        this.wishlistSubmitting = false;
        this.wishlist = { customerName: '', customerPhone: '', whatsappNumber: '', desiredItems: '', notes: '' };
        this.usePhoneForWhatsapp = true;
      },
      error: (error) => {
        this.wishlistMessage = error?.message || 'Could not submit request.';
        this.toast.error(this.wishlistMessage);
        this.wishlistSubmitting = false;
      }
    });
  }

  syncWhatsappFromPhone(): void {
    if (this.usePhoneForWhatsapp) {
      this.wishlist.whatsappNumber = this.wishlist.customerPhone;
    }
  }
}
