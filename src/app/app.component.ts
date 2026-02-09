import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'UNBEATABLE Imports';

  isAdminRoute = false;
  adminView: 'products' | 'wishlists' | 'bookings' = 'products';

  constructor(
    public auth: AuthService,
    private router: Router
  ) {
    this.syncRouteState();
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncRouteState());
  }

  logout(): void {
    this.auth.logout();
  }

  private syncRouteState(): void {
    const tree = this.router.parseUrl(this.router.url);
    const primary = tree.root.children['primary'];
    const seg0 = primary?.segments?.[0]?.path;
    const seg1 = primary?.segments?.[1]?.path;

    this.isAdminRoute = seg0 === 'admin';
    if (!this.isAdminRoute) {
      this.adminView = 'products';
      return;
    }

    if (seg1 === 'viewWishlist') this.adminView = 'wishlists';
    else if (seg1 === 'viewBookings') this.adminView = 'bookings';
    else this.adminView = 'products';
  }
}
