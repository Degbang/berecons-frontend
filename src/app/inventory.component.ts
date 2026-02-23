import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { appSettings } from './app.settings';
import { Product } from './models';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})
export class InventoryComponent implements OnInit {
  products: Product[] = [];
  productsLoading = false;
  productsError = '';

  searchTerm = '';
  statusFilter = 'ALL';
  categoryFilter = 'ALL';
  previewUrl: string | null = null;
  storyOpen = false;

  whatsappNumber = appSettings.whatsappNumber;
  cloudinaryCloudName = appSettings.cloudinaryCloudName;

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  get whatsappConfigured(): boolean {
    return Boolean(this.whatsappNumber && this.whatsappNumber.trim().length > 3);
  }

  get categories(): string[] {
    const unique = new Set<string>();
    this.products.forEach((product) => {
      if (product.category) {
        unique.add(product.category);
      }
    });
    return ['ALL', ...Array.from(unique).sort()];
  }

  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.products.filter((product) => {
      const status = (product.status ?? 'AVAILABLE').toUpperCase();
      if (status === 'SOLD') {
        return false;
      }
      const matchesTerm = term
        ? `${product.name} ${product.brand ?? ''} ${product.category ?? ''}`
            .toLowerCase()
            .includes(term)
        : true;
      const matchesStatus =
        this.statusFilter === 'ALL' || status === this.statusFilter;
      const matchesCategory =
        this.categoryFilter === 'ALL' || (product.category ?? '') === this.categoryFilter;
      return matchesTerm && matchesStatus && matchesCategory;
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

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'ALL';
    this.categoryFilter = 'ALL';
  }

  getWhatsAppLink(product: Product): string {
    if (!this.whatsappConfigured) {
      return '#';
    }
    const phone = this.normalizePhone(this.whatsappNumber);
    const message = `Hi, I'm interested in ${product.name}. Is it available?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  isReserved(product: Product): boolean {
    return (product.status ?? '').toUpperCase() === 'RESERVED';
  }

  blockIfReserved(event: Event, product: Product): void {
    if (this.isReserved(product)) {
      event.preventDefault();
      event.stopPropagation();
      this.toast.error('This item is reserved.');
    }
  }

  private normalizePhone(value?: string): string {
    if (!value) return '';
    let digits = value.replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.startsWith('0') && digits.length === 10) {
      digits = `233${digits.slice(1)}`;
    } else if (digits.length === 9 && !digits.startsWith('233')) {
      digits = `233${digits}`;
    }
    return digits;
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

  openStory(): void {
    this.storyOpen = true;
  }

  closeStory(): void {
    this.storyOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.previewUrl) {
      this.closePreview();
    }
    if (this.storyOpen) {
      this.closeStory();
    }
  }

  thumbUrl(url?: string): string {
    // Keep thumbnails crisp on modern (high-DPI) screens.
    return this.resolveImageUrl(url, 'f_auto,q_auto:best,dpr_auto,w_1000');
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
}
