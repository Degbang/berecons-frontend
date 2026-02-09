import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { BookingRequest } from './models';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css'
})
export class BookingComponent {
  booking: BookingRequest = {
    customerName: '',
    customerPhone: '',
    whatsappNumber: '',
    productId: null,
    productName: '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  };
  usePhoneForWhatsapp = true;
  bookingMessage = '';
  bookingSubmitting = false;

  private querySub?: Subscription;

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      const pid = params.get('productId');
      const pname = params.get('productName');
      if (pid && !Number.isNaN(Number(pid))) {
        this.booking.productId = Number(pid);
      }
      if (pname) {
        this.booking.productName = pname;
      }
      this.syncWhatsappFromPhone();
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  submitBooking(): void {
    this.bookingMessage = '';
    this.bookingSubmitting = true;
    this.syncWhatsappFromPhone();

    this.api.createBooking(this.booking).subscribe({
      next: () => {
        this.bookingMessage = 'Booking received. We will confirm your viewing time.';
        this.toast.success('Booking sent successfully.');
        this.bookingSubmitting = false;
        this.booking = {
          customerName: '',
          customerPhone: '',
          whatsappNumber: '',
          productId: null,
          productName: '',
          preferredDate: '',
          preferredTime: '',
          notes: ''
        };
        this.usePhoneForWhatsapp = true;
      },
      error: (error) => {
        this.bookingMessage = error?.message || 'Could not submit booking.';
        this.toast.error(this.bookingMessage);
        this.bookingSubmitting = false;
      }
    });
  }

  syncWhatsappFromPhone(): void {
    if (this.usePhoneForWhatsapp) {
      this.booking.whatsappNumber = this.booking.customerPhone;
    }
  }
}
