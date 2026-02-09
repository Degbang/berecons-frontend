import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { BookingComponent } from './booking.component';
import { InventoryComponent } from './inventory.component';
import { WishlistComponent } from './wishlist.component';

export const routes: Routes = [
  { path: '', component: InventoryComponent },
  { path: 'wishlist', component: WishlistComponent },
  { path: 'booking', component: BookingComponent },
  { path: 'admin', pathMatch: 'full', redirectTo: 'admin/addProducts' },
  { path: 'admin/addProducts', component: AdminComponent, data: { adminView: 'products' } },
  { path: 'admin/viewWishlist', component: AdminComponent, data: { adminView: 'wishlists' } },
  { path: 'admin/viewBookings', component: AdminComponent, data: { adminView: 'bookings' } },
  { path: '**', redirectTo: '' }
];
