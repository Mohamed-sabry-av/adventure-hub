import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WooCommerceAccountService {
  private apiEndpoint = '';

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) {}

  // Get Orders
  getOrders(customerId: number): Observable<any> {
    const params = new HttpParams().set('customer', customerId.toString());
    return this.apiService.getRequest('orders', { params });
  }

  // Get Downloads
  getDownloads(customerId: number): Observable<any> {
    return this.apiService.getRequest(`customers/${customerId}/downloads`);
  }

  // Get Addresses and Account Details
  getCustomerDetails(customerId: number): Observable<any> {
    return this.apiService.getRequest(`customers/${customerId}`);
  }

  // Get Payment Gateways
  getPaymentGateways(): Observable<any> {
    return this.apiService.getRequest('payment_gateways');
  }

  // Get Wishlist (if you have YITH Wishlist Plugin)
  getWishlist(): Observable<any> {
    return this.apiService.getRequest('yith/wishlist/v1/lists');
  }

  // Log out
  logout(): void {
    this.localStorageService.removeItem('auth_token');
    this.localStorageService.removeItem('auth_user');
    this.localStorageService.removeItem('customerId');
  }
}
