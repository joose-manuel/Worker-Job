import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  headers(token?: string | null) {
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  get<T>(path: string, token?: string | null) {
    return this.http.get<T>(`${BASE}${path}`, this.headers(token));
  }

  post<T>(path: string, body: unknown, token?: string | null) {
    return this.http.post<T>(`${BASE}${path}`, body, this.headers(token));
  }

  put<T>(path: string, body: unknown, token?: string | null) {
    return this.http.put<T>(`${BASE}${path}`, body, this.headers(token));
  }

  patch<T>(path: string, body: unknown, token?: string | null) {
    return this.http.patch<T>(`${BASE}${path}`, body, this.headers(token));
  }

  delete<T>(path: string, token?: string | null) {
    return this.http.delete<T>(`${BASE}${path}`, this.headers(token));
  }
}
