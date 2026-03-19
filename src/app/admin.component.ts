import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { appSettings } from './app.settings';
import { Product } from './models';
import { ToastService } from './toast.service';

type UploadDraft = {
  id: string;
  imageRef: string;
  fileName: string;
  name: string;
  category: string;
  price: number | null;
};

type IndexedUploadDraft = {
  index: number;
  draft: UploadDraft;
};

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
    conditionNote: 'NEW',
    modelNumber: '',
    capacity: '',
    price: null,
    currency: 'GHS',
    status: 'AVAILABLE',
    description: '',
    imageUrls: []
  };
  brandOptions = [
    "Winia/Daewoo",
    "Samsung",
    "LG",
    "Member's Mark",
    "Sam's Club",
    "Ashley",
    "Mainstays",
    "Frigidaire",
    "Razor",
    "Oral-B",
    "Ozark Trail",
    "Z-Line",
    "Two Harbours",
    "ZeroWater",
    "Brita",
    "Ionvac",
    "Cookworks",
    "SentrySafe",
    "Cuisinart",
    "Blackstone",
    "Pitboss",
    "FitRx",
    "Arctic King",
    "Hisense",
    "Kraus",
    "Yaheetech",
    "Better Homes & Gardens"
  ];
  categoryOptions = [
    'Refrigerators',
    'Freezers',
    'Furniture',
    'Sofa',
    'Tables',
    'Beds',
    'Chairs',
    'Bathroom furniture',
    'Kitchen furniture',
    'Stoves',
    'Grills',
    'Tents',
    'Canopies',
    'Ovens',
    'Mattresses',
    'Basketball Hoops',
    'Fitness dumbbells',
    'Decoration',
    'Kitchen appliances',
    'TVs',
    'Drones'
  ];
  conditionOptions = ['NEW', 'USED'];
  productStatuses = ['AVAILABLE', 'RESERVED', 'SOLD'];
  editingProductId: number | null = null;
  adminMessage = '';
  adminSubmitting = false;

  imageUploading = false;
  imageUploadMessage = '';
  uploadFlowStep: 1 | 2 | 3 = 1;
  uploadFlowMessage = '';
  publishingBatch = false;
  uploadDrafts: UploadDraft[] = [];
  uploadConcurrency = 4;

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
    const preview = this.resolveImageUrl(url);
    if (preview) {
      this.previewUrl = preview;
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

  onCategoryChange(): void {
    if (!this.isCoolingCategory(this.productForm.category)) {
      this.productForm.modelNumber = '';
      this.productForm.capacity = '';
    }
  }

  isCoolingCategory(category?: string | null): boolean {
    return ['Refrigerators', 'Freezers'].includes((category || '').trim());
  }

  formatCondition(value?: string | null): string {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === 'USED') return 'Used';
    return 'New';
  }

  getProductTitle(product: Product): string {
    const parts = [
      product.name,
      product.brand,
      product.category,
      this.formatCondition(product.conditionNote),
      product.modelNumber,
      product.capacity
    ].filter(Boolean);
    const price =
      product.price != null
        ? `${product.currency || 'GHS'} ${product.price}`
        : '';
    if (price) parts.push(price);
    return parts.join(' • ');
  }

  thumbUrl(url?: string): string {
    return this.resolveImageUrl(url, 'f_auto,q_auto:good,dpr_auto,w_620');
  }

  resolveImageUrl(url?: string, transform?: string): string {
    const value = (url || '').trim();
    if (!value) return '';

    if (this.isHttpUrl(value)) {
      if (!transform) return value;
      const marker = '/image/upload/';
      const idx = value.indexOf(marker);
      if (idx >= 0) {
        const prefix = value.substring(0, idx + marker.length);
        const rest = value.substring(idx + marker.length);
        return `${prefix}${transform}/${rest}`;
      }
      return value;
    }

    if (!this.cloudinaryCloudName) {
      return value;
    }

    const publicId = value.replace(/^\/+/, '');
    const transformPart = transform ? `${transform}/` : '';
    return `https://res.cloudinary.com/${this.cloudinaryCloudName}/image/upload/${transformPart}${publicId}`;
  }

  private isHttpUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
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
      conditionNote: product.conditionNote || 'NEW',
      modelNumber: product.modelNumber || '',
      capacity: product.capacity || '',
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
      conditionNote: 'NEW',
      modelNumber: '',
      capacity: '',
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
      modelNumber: this.productForm.modelNumber,
      capacity: this.productForm.capacity,
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

    this.uploadToCloudinary(file)
      .then((result) => {
        const imageRef = result.public_id?.trim() || result.secure_url;
        this.productForm.imageUrls = [...(this.productForm.imageUrls || []), imageRef];
        this.imageUploading = false;
        this.imageUploadMessage = 'Image uploaded.';
        this.toast.success('Image uploaded.');
        input.value = '';
      })
      .catch((error) => {
        this.imageUploading = false;
        this.imageUploadMessage = this.getCloudinaryErrorMessage(error);
        this.toast.error(this.imageUploadMessage);
        input.value = '';
      });
  }

  removeImage(index: number): void {
    if (!this.productForm.imageUrls) return;
    this.productForm.imageUrls = this.productForm.imageUrls.filter((_, i) => i !== index);
  }

  goToCategorizeStep(): void {
    if (!this.uploadDrafts.length) return;
    this.uploadFlowStep = 2;
    this.uploadFlowMessage = '';
  }

  goToUploadStep(): void {
    this.uploadFlowStep = 1;
    this.uploadFlowMessage = '';
  }

  goToFinishStep(): void {
    if (!this.uploadDrafts.length) {
      this.uploadFlowMessage = 'Upload at least one picture first.';
      return;
    }

    const missing = this.getMissingUploadDrafts();
    if (missing.length) {
      this.uploadFlowMessage = `Complete name and category for ${missing.length} item(s) before continuing.`;
      return;
    }

    this.uploadFlowMessage = '';
    this.uploadFlowStep = 3;
  }

  removeUploadDraft(id: string): void {
    this.uploadDrafts = this.uploadDrafts.filter((draft) => draft.id !== id);
    if (!this.uploadDrafts.length) {
      this.uploadFlowStep = 1;
    }
  }

  resetUploadFlow(): void {
    this.uploadDrafts = [];
    this.uploadFlowStep = 1;
    this.uploadFlowMessage = '';
    this.publishingBatch = false;
  }

  canPublishUploadFlow(): boolean {
    return (
      this.uploadDrafts.length > 0 &&
      this.uploadDrafts.every((draft) => draft.name.trim() && draft.category.trim())
    );
  }

  canProceedToFinish(): boolean {
    return this.uploadDrafts.length > 0 && this.getMissingUploadDrafts().length === 0;
  }

  isUploadDraftInvalid(draft: UploadDraft): boolean {
    return !draft.name?.trim() || !draft.category?.trim();
  }

  async uploadFlowFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (!files.length) return;

    if (!this.cloudinaryCloudName || !this.cloudinaryUploadPreset) {
      this.uploadFlowMessage = 'Set Cloudinary cloud name and upload preset in app.settings.ts.';
      input.value = '';
      return;
    }

    this.imageUploading = true;
    this.uploadFlowMessage = `Uploading 0/${files.length}...`;

    const addedDrafts = await this.uploadFilesInParallel(files);
    this.imageUploading = false;
    if (!addedDrafts.length) {
      this.uploadFlowMessage = 'No pictures were uploaded.';
      this.toast.error(this.uploadFlowMessage);
      input.value = '';
      return;
    }

    this.uploadDrafts = [...this.uploadDrafts, ...addedDrafts];
    this.uploadFlowMessage = `${addedDrafts.length} picture(s) uploaded.`;
    this.toast.success(this.uploadFlowMessage);
    this.goToCategorizeStep();
    input.value = '';
  }

  async publishUploadFlow(): Promise<void> {
    if (!this.canPublishUploadFlow()) {
      this.uploadFlowMessage = 'Every picture must have a name and category.';
      return;
    }

    this.publishingBatch = true;
    this.adminMessage = '';
    this.uploadFlowMessage = 'Publishing products...';

    let successCount = 0;
    for (let i = 0; i < this.uploadDrafts.length; i += 1) {
      const draft = this.uploadDrafts[i];
      const payload: Product = {
        name: draft.name.trim(),
        brand: this.productForm.brand,
        category: draft.category.trim(),
        conditionNote: this.productForm.conditionNote || 'NEW',
        modelNumber: this.productForm.modelNumber,
        capacity: this.productForm.capacity,
        price: draft.price ?? undefined,
        currency: this.productForm.currency || 'GHS',
        status: this.productForm.status || 'AVAILABLE',
        description: this.productForm.description,
        imageUrls: [draft.imageRef]
      };

      try {
        await firstValueFrom(this.api.createProduct(payload));
        successCount += 1;
        this.uploadFlowMessage = `Publishing ${i + 1}/${this.uploadDrafts.length}...`;
      } catch {
        this.publishingBatch = false;
        this.uploadFlowMessage = `Failed while publishing "${draft.name}".`;
        this.toast.error(this.uploadFlowMessage);
        return;
      }
    }

    this.publishingBatch = false;
    this.adminMessage = `${successCount} product(s) published.`;
    this.toast.success(this.adminMessage);
    this.resetUploadFlow();
    this.loadProducts();
  }

  private toDraftName(fileName: string): string {
    const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
    return withoutExtension
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getMissingUploadDrafts(): UploadDraft[] {
    return this.uploadDrafts.filter((draft) => !draft.name?.trim() || !draft.category?.trim());
  }

  private async uploadFilesInParallel(files: File[]): Promise<UploadDraft[]> {
    const uploaded: IndexedUploadDraft[] = [];
    const failed: string[] = [];
    let next = 0;
    let completed = 0;
    const total = files.length;
    const workerCount = Math.min(this.uploadConcurrency, total);

    const worker = async () => {
      while (next < total) {
        const index = next;
        next += 1;
        const file = files[index];
        try {
          const draft = await this.uploadSingleFileDraft(file, index);
          uploaded.push({ index, draft });
        } catch {
          failed.push(file.name);
        } finally {
          completed += 1;
          this.uploadFlowMessage = `Uploading ${completed}/${total}...`;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (failed.length) {
      this.toast.error(`Failed to upload ${failed.length} file(s).`);
      const failedPreview = failed.slice(0, 3).join(', ');
      this.uploadFlowMessage = failed.length > 3
        ? `Uploaded ${uploaded.length}/${total}. Failed: ${failedPreview}...`
        : `Uploaded ${uploaded.length}/${total}. Failed: ${failedPreview}`;
    }

    return uploaded
      .sort((a, b) => a.index - b.index)
      .map((entry) => entry.draft);
  }

  private async uploadSingleFileDraft(file: File, index: number): Promise<UploadDraft> {
    const result = await this.uploadToCloudinary(file);

    const imageRef = result.public_id?.trim() || result.secure_url;
    const defaultName = this.toDraftName(file.name);
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      imageRef,
      fileName: file.name,
      name: defaultName,
      category: this.productForm.category || '',
      price: this.productForm.price ?? null
    };
  }

  private async uploadToCloudinary(file: File): Promise<{ secure_url: string; public_id?: string }> {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;

    // Attempt 1: minimal unsigned payload (most compatible with unsigned presets).
    const minimal = new FormData();
    minimal.append('file', file);
    minimal.append('upload_preset', this.cloudinaryUploadPreset);
    try {
      return await firstValueFrom(
        this.http.post<{ secure_url: string; public_id?: string }>(uploadUrl, minimal)
      );
    } catch (firstError) {
      // Attempt 2: optional folder hint if preset allows it.
      const withFolder = new FormData();
      withFolder.append('file', file);
      withFolder.append('upload_preset', this.cloudinaryUploadPreset);
      withFolder.append('folder', 'berecons/products');
      try {
        return await firstValueFrom(
          this.http.post<{ secure_url: string; public_id?: string }>(uploadUrl, withFolder)
        );
      } catch {
        throw firstError;
      }
    }
  }

  private getCloudinaryErrorMessage(error: any): string {
    const cloudinaryMessage = error?.error?.error?.message;
    if (typeof cloudinaryMessage === 'string' && cloudinaryMessage.trim()) {
      return `Upload failed: ${cloudinaryMessage}`;
    }
    const fallback = error?.message;
    if (typeof fallback === 'string' && fallback.trim()) {
      return `Upload failed: ${fallback}`;
    }
    return 'Upload failed. Check Cloudinary preset settings.';
  }
}
