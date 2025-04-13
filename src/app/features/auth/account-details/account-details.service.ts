import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WooCommerceAccountService {
  private baseUrl = 'https://adventures-hub.com/';

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

  // Update Customer Details
  updateCustomerDetails(customerId: number, customerData: any): Observable<any> {
    return this.apiService.putRequest(`customers/${customerId}`, customerData);
  }

  // Update Customer Billing Address
  updateBillingAddress(customerId: number, billingData: any): Observable<any> {
    const data = { billing: billingData };
    return this.apiService.putRequest(`customers/${customerId}`, data);
  }

  // Update Customer Shipping Address
  updateShippingAddress(customerId: number, shippingData: any): Observable<any> {
    const data = { shipping: shippingData };
    return this.apiService.putRequest(`customers/${customerId}`, data);
  }

  // Get Payment Gateways
  getPaymentGateways(): Observable<any> {
    return this.apiService.getRequest('payment_gateways');
  }

  // Update Payment Method
  updatePaymentMethod(paymentMethodId: string, data: any): Observable<any> {
    return this.apiService.putRequest(`payment_gateways/${paymentMethodId}`, data);
  }

  // Get Wishlist
  getWishlist(): Observable<any> {
    const url = `${this.baseUrl}wp-json/wc-wishlist/v1/get`;
    return this.apiService.getExternalRequest(url);
  }

  // Add item to Wishlist
  addToWishlist(productId: number): Observable<any> {
    const url = `${this.baseUrl}wp-json/wc-wishlist/v1/add`;
    const body = { product_id: productId };
    return this.apiService.postExternalRequest(url, body);
  }

  // Remove item from Wishlist
  removeFromWishlist(productId: number): Observable<any> {
    const url = `${this.baseUrl}wp-json/wc-wishlist/v1/remove`;
    const body = { product_id: productId };
    return this.apiService.postExternalRequest(url, body);
  }

  // Get Customer ID from local storage
  getCustomerId(): number | null {
    const customerIdStr: any = this.localStorageService.getItem('customerId');
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }

  // Log out
  logout(): void {
    this.localStorageService.removeItem('auth_token');
    this.localStorageService.removeItem('auth_user');
    this.localStorageService.removeItem('customerId');
  }
}