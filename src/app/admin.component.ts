import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { appSettings } from './app.settings';
import { Product } from './models';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  productsLoading = false;
  productsError = '';
  productsMessage = '';
  private deletingProductIds = new Set<number>();

  productForm: Product = {
    name: '',
    brand: '',
    category: '',
    conditionNote: 'New',
    price: null,
    currency: 'GHS',
    status: 'AVAILABLE',
    description: '',
    imageUrls: []
  };
  productStatuses = ['AVAILABLE', 'RESERVED', 'SOLD'];
  editingProductId: number | null = null;
  adminMessage = '';
  adminSubmitting = false;

  imageUploading = false;
  imageUploadMessage = '';

  cloudinaryCloudName = appSettings.cloudinaryCloudName;
  cloudinaryUploadPreset = appSettings.cloudinaryUploadPreset;

  adminView: 'products' | 'bookings' | 'wishlists' = 'products';

  get visibleProducts(): Product[] {
    return this.products.filter(
      (product) => (product.status ?? 'AVAILABLE').toUpperCase() !== 'SOLD'
    );
  }

  loginUsername = '';
  loginPassword = '';
  showLoginPassword = false;
  loginMessage = '';

  resetKey = '';
  resetUsername = '';
  resetPassword = '';
  showResetKey = false;
  showResetPassword = false;
  resetMessage = '';
  forgotPanelOpen = false;

  bookings: any[] = [];
  bookingCounter = 0;
  bookingsLoading = false;
  bookingsError = '';
  previewUrl: string | null = null;
  wishlists: any[] = [];
  wishlistsLoading = false;
  wishlistsError = '';
  private routeSub?: Subscription;
  private prefetchDone = false;

  constructor(
    private api: ApiService,
    private http: HttpClient,
    public auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.syncViewFromUrl(this.router.url);
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.syncViewFromUrl(this.router.url));
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  login(): void {
    this.loginMessage = '';
    this.auth.login(this.loginUsername, this.loginPassword).subscribe({
      next: () => {
        this.loginMessage = 'Logged in';
        this.toast.success('Logged in.');
        // Load the data for the current view after auth is set.
        if (this.adminView === 'products') this.loadProducts();
        if (this.adminView === 'bookings') this.loadBookings();
        if (this.adminView === 'wishlists') this.loadWishlists();
        this.prefetchOtherViews(this.adminView);
      },
      error: (err) => {
        this.loginMessage = err?.message || 'Login failed';
        this.toast.error(this.loginMessage);
      }
    });
  }

  private prefetchOtherViews(current: 'products' | 'bookings' | 'wishlists'): void {
    if (this.prefetchDone) return;
    this.prefetchDone = true;
    window.setTimeout(() => {
      if (!this.auth.isLoggedIn()) return;
      if (current !== 'products') this.loadProducts();
      if (current !== 'bookings') this.loadBookings();
      if (current !== 'wishlists') this.loadWishlists();
    }, 250);
  }

  logout(): void {
    this.auth.logout();
    this.prefetchDone = false;
  }

  resetCredentials(): void {
    this.resetMessage = '';
    this.auth.reset(this.resetKey, this.resetUsername, this.resetPassword).subscribe({
      next: () => {
        this.resetMessage = 'Admin credentials updated';
        this.toast.success('Admin credentials updated.');
      },
      error: (err) => {
        this.resetMessage = err?.message || 'Reset failed';
        this.toast.error(this.resetMessage);
      }
    });
  }

  loadProducts(): void {
    this.productsLoading = true;
    this.productsError = '';

    this.api.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.productsLoading = false;
      },
      error: (error) => {
        this.productsError = error?.message || 'Unable to load products.';
        this.toast.error(this.productsError);
        this.productsLoading = false;
      }
    });
  }

  loadBookings(): void {
    this.bookingsLoading = true;
    this.bookingsError = '';
    this.api.getBookings().subscribe({
      next: (data) => {
        this.bookings = data;
        this.bookingCounter = data.filter((b) => b.status === 'PENDING').length;
        this.bookingsLoading = false;
      },
      error: (err) => {
        this.bookingsError = err?.message || 'Unable to load bookings.';
        this.toast.error(this.bookingsError);
        this.bookingsLoading = false;
      }
    });
  }

  loadWishlists(): void {
    this.wishlistsLoading = true;
    this.wishlistsError = '';
    this.api.getWishlists().subscribe({
      next: (data) => {
        this.wishlists = data;
        this.wishlistsLoading = false;
      },
      error: (err) => {
        this.wishlistsError = err?.message || 'Unable to load wishlists.';
        this.toast.error(this.wishlistsError);
        this.wishlistsLoading = false;
      }
    });
  }

  updateBooking(booking: any, status: string): void {
    const reason = status === 'DECLINED' ? prompt('Reason for decline?') || '' : '';
    this.api.updateBookingStatus(booking.id, status, reason).subscribe({
      next: (updated) => {
        this.bookings = this.bookings.map((b) => (b.id === updated.id ? updated : b));
        this.bookingCounter = this.bookings.filter((b) => b.status === 'PENDING').length;
        this.toast.success('Booking updated.');
      },
      error: () => {
        this.toast.error('Could not update booking.');
      }
    });
  }

  updateWishlist(wl: any, status: string): void {
    this.api.updateWishlistStatus(wl.id, status).subscribe({
      next: (updated) => {
        this.wishlists = this.wishlists.map((w) => (w.id === updated.id ? updated : w));
        this.toast.success('Wishlist updated.');
      },
      error: () => {
        this.toast.error('Could not update wishlist.');
      }
    });
  }

  getBookingWhatsappLink(booking: any): string {
    const number = booking?.whatsappNumber || booking?.customerPhone;
    const phone = this.normalizePhone(number);
    if (!phone) return '';
    const name = booking?.customerName || 'there';
    const item = booking?.productName || 'your item';
    const date = booking?.preferredDate ? String(booking.preferredDate) : '';
    const time = booking?.preferredTime ? String(booking.preferredTime) : '';
    const when = [date, time].filter(Boolean).join(' ');
    const status = (booking?.status || 'PENDING').toUpperCase();
    const reason = booking?.statusReason ? ` Reason: ${booking.statusReason}` : '';

    let message = `Hi ${name}, we received your viewing request for ${item}${when ? ` on ${when}` : ''}. Status: ${status}.`;
    if (status === 'APPROVED') {
      message = `Hi ${name}, your viewing request for ${item}${when ? ` on ${when}` : ''} is approved. Please confirm if this time works.`;
    } else if (status === 'DECLINED') {
      message = `Hi ${name}, your viewing request for ${item}${when ? ` on ${when}` : ''} was declined.${reason}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  getWishlistWhatsappLink(wl: any): string {
    const number = wl?.whatsappNumber || wl?.customerPhone;
    const phone = this.normalizePhone(number);
    if (!phone) return '';
    const name = wl?.customerName || 'there';
    const status = (wl?.status || 'NEW').toUpperCase();
    const items = (wl?.desiredItems || '').trim();
    const itemLine = items ? `Items: ${items}. ` : '';
    const noteLine = wl?.notes ? `Notes: ${wl.notes}. ` : '';
    let message = `Hi ${name}, thanks for your wish list. ${itemLine}${noteLine}We will check availability and get back to you.`;
    if (status === 'CONTACTED') {
      message = `Hi ${name}, we are reviewing your wish list. ${itemLine}${noteLine}We will share updates shortly.`;
    } else if (status === 'CLOSED') {
      message = `Hi ${name}, we have completed your wish list request. ${itemLine}${noteLine}Let us know if you need more items.`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  getCallLink(number?: string): string {
    const phone = this.normalizePhone(number);
    return phone ? `tel:${phone}` : '';
  }

  openPreview(url?: string): void {
    if (url) {
      this.previewUrl = url;
    }
  }

  closePreview(): void {
    this.previewUrl = null;
  }

  switchView(view: 'products' | 'bookings' | 'wishlists'): void {
    const target =
      view === 'bookings'
        ? '/admin/viewBookings'
        : view === 'wishlists'
          ? '/admin/viewWishlist'
          : '/admin/addProducts';
    this.router.navigateByUrl(target);
  }

  private syncViewFromUrl(url: string): void {
    let view: 'products' | 'bookings' | 'wishlists' = 'products';
    if (url.includes('/admin/viewBookings')) view = 'bookings';
    else if (url.includes('/admin/viewWishlist')) view = 'wishlists';
    this.adminView = view;
    if (!this.auth.isLoggedIn()) return;
    if (view === 'products') this.loadProducts();
    if (view === 'bookings') this.loadBookings();
    if (view === 'wishlists') this.loadWishlists();
    this.prefetchOtherViews(view);
  }

  thumbUrl(url?: string): string {
    if (!url) return '';
    const marker = '/image/upload/';
    const idx = url.indexOf(marker);
    if (idx >= 0) {
      const prefix = url.substring(0, idx + marker.length);
      const rest = url.substring(idx + marker.length);
      return `${prefix}f_auto,q_auto:good,dpr_auto,w_620/${rest}`;
    }
    return url;
  }

  private normalizePhone(value?: string): string {
    if (!value) return '';
    let digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    // Default to Ghana country code if a local 0XXXXXXXXX number is used.
    if (digits.startsWith('0') && digits.length === 10) {
      digits = `233${digits.slice(1)}`;
    } else if (digits.length === 9 && !digits.startsWith('233')) {
      digits = `233${digits}`;
    }
    return digits;
  }

  isDeleting(id?: number | null): boolean {
    return typeof id === 'number' && this.deletingProductIds.has(id);
  }

  deleteProduct(product: Product): void {
    if (!product.id) return;
    const id = product.id;
    if (this.isDeleting(id)) return;
    const ok = confirm(`Delete "${product.name}"?`);
    if (!ok) return;

    this.productsMessage = '';
    this.deletingProductIds.add(id);
    this.api.deleteProduct(id).subscribe({
      next: () => {
        this.products = this.products.filter((p) => p.id !== id);
        this.productsMessage = 'Product deleted.';
        this.toast.success('Product deleted.');
        window.setTimeout(() => {
          if (this.productsMessage === 'Product deleted.') this.productsMessage = '';
        }, 2000);
        this.deletingProductIds.delete(id);
      },
      error: (err) => {
        this.productsMessage = err?.message || 'Could not delete product.';
        this.toast.error(this.productsMessage);
        this.deletingProductIds.delete(id);
      }
    });
  }

  startEdit(product: Product): void {
    this.editingProductId = product.id ?? null;
    this.productForm = {
      id: product.id,
      name: product.name,
      brand: product.brand || '',
      category: product.category || '',
      conditionNote: product.conditionNote || 'New',
      price: product.price ?? null,
      currency: product.currency || 'GHS',
      status: product.status || 'AVAILABLE',
      description: product.description || '',
      imageUrls: product.imageUrls ? [...product.imageUrls] : []
    };
    this.adminMessage = '';
  }

  resetProductForm(): void {
    this.editingProductId = null;
    this.productForm = {
      name: '',
      brand: '',
      category: '',
      conditionNote: 'New',
      price: null,
      currency: 'GHS',
      status: 'AVAILABLE',
      description: '',
      imageUrls: []
    };
    this.adminMessage = '';
    this.imageUploadMessage = '';
  }

  saveProduct(): void {
    this.adminMessage = '';
    this.adminSubmitting = true;

    const payload: Product = {
      name: this.productForm.name,
      brand: this.productForm.brand,
      category: this.productForm.category,
      conditionNote: this.productForm.conditionNote,
      price: this.productForm.price ?? undefined,
      currency: this.productForm.currency,
      status: this.productForm.status,
      description: this.productForm.description,
      imageUrls: this.productForm.imageUrls
    };

    const request$ = this.editingProductId
      ? this.api.updateProduct(this.editingProductId, payload)
      : this.api.createProduct(payload);

    request$.subscribe({
      next: () => {
        this.adminMessage = this.editingProductId ? 'Product updated.' : 'Product created.';
        this.toast.success(this.adminMessage);
        this.adminSubmitting = false;
        this.resetProductForm();
        this.loadProducts();
      },
      error: (error) => {
        this.adminMessage = error?.message || 'Could not save product.';
        this.toast.error(this.adminMessage);
        this.adminSubmitting = false;
      }
    });
  }

  updateProductStatus(product: Product, status: string): void {
    if (!product.id) return;

    this.api.updateProductStatus(product.id, status).subscribe({
      next: (updated) => {
        this.products = this.products.map((item) => (item.id === updated.id ? updated : item));
        this.toast.success('Status updated.');
      },
      error: () => {
        this.productsError = 'Could not update status.';
        this.toast.error(this.productsError);
      }
    });
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    if (!this.cloudinaryCloudName || !this.cloudinaryUploadPreset) {
      this.imageUploadMessage = 'Set Cloudinary cloud name and upload preset in app.settings.ts.';
      input.value = '';
      return;
    }

    const file = input.files[0];
    const formData = new FormData();
    this.imageUploading = true;
    this.imageUploadMessage = 'Uploading...';

    // Upload the original file to preserve quality.
    formData.append('file', file);
    formData.append('upload_preset', this.cloudinaryUploadPreset);

    this.http
      .post<{ secure_url: string }>(
        `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`,
        formData
      )
      .subscribe({
        next: (result) => {
          this.productForm.imageUrls = [...(this.productForm.imageUrls || []), result.secure_url];
          this.imageUploading = false;
          this.imageUploadMessage = 'Image uploaded.';
          this.toast.success('Image uploaded.');
          input.value = '';
        },
        error: () => {
          this.imageUploading = false;
          this.imageUploadMessage = 'Upload failed.';
          this.toast.error(this.imageUploadMessage);
        }
      });
  }

  removeImage(index: number): void {
    if (!this.productForm.imageUrls) return;
    this.productForm.imageUrls = this.productForm.imageUrls.filter((_, i) => i !== index);
  }
}
