import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { appSettings } from './app.settings';

const TOKEN_KEY = 'berecons_admin_token';
const USER_KEY = 'berecons_admin_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = `${appSettings.apiBase}/auth`;

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {
    return this.http.post<{ token: string; username: string }>(`${this.baseUrl}/login`, { username, password })
      .pipe(tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, res.username);
      }));
  }

  reset(resetKey: string, newUsername: string, newPassword: string) {
    return this.http.post(`${this.baseUrl}/reset`, { resetKey, newUsername, newPassword });
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get username(): string | null {
    return localStorage.getItem(USER_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }
}
