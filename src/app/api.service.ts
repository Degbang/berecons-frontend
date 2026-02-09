import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { appSettings } from './app.settings';
import { BookingRequest, Product, WishlistRequest } from './models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = appSettings.apiBase;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  createProduct(payload: Product): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/products`, payload);
  }

  updateProduct(id: number, payload: Product): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/products/${id}`, payload);
  }

  updateProductStatus(id: number, status: string): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/products/${id}/status`, { status });
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${id}`);
  }

  createWishlist(payload: WishlistRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/wishlists`, payload);
  }

  getWishlists(status?: string): Observable<any[]> {
    const url = status ? `${this.baseUrl}/wishlists?status=${status}` : `${this.baseUrl}/wishlists`;
    return this.http.get<any[]>(url);
  }

  updateWishlistStatus(id: number, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/wishlists/${id}/status`, { status });
  }

  createBooking(payload: BookingRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/bookings`, payload);
  }

  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/bookings`);
  }

  updateBookingStatus(id: number, status: string, reason?: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/bookings/${id}/status`, { status, reason });
  }
}
