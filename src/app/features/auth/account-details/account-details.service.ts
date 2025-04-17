import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { AccountAuthService } from '../account-auth.service';

@Injectable({
  providedIn: 'root',
})
export class WooCommerceAccountService {
  private wishlistBaseUrl = 'https://adventures-hub.com/wp-json/mywishlist/v1/';

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService,
    private accountAuthService: AccountAuthService
  ) {}

  // Get Wishlist using the custom endpoint
  getWishlist(): Observable<any> {
    if (!this.isLoggedIn()) {
      console.warn('No valid token found, cannot fetch wishlist');
      return of([]);
    }

    const headers = this.getAuthHeaders();
    console.log('Fetching wishlist with headers:', headers);

    return this.apiService.getExternalRequest(`${this.wishlistBaseUrl}get`, { headers }).pipe(
      tap((response) => console.log('Wishlist response:', response)),
      catchError((error) => {
        console.error('Error fetching wishlist:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          url: error.url || `${this.wishlistBaseUrl}get`,
          error: error.error,
        });
        return of([]);
      })
    );
  }

  // Add Item to Wishlist using the custom endpoint
  addToWishlist(productId: number): Observable<any> {
    if (!this.isLoggedIn()) {
      console.warn('No valid token found, cannot add to wishlist');
      return of({ success: false, message: 'User not logged in' });
    }

    const headers = this.getAuthHeaders();
    console.log('Adding to wishlist with headers:', headers, 'product_id:', productId);

    return this.apiService
      .postExternalRequest(
        `${this.wishlistBaseUrl}add`,
        { product_id: productId },
        { headers }
      )
      .pipe(
        tap((response) => console.log('Add to wishlist response:', response)),
        catchError((error) => {
          console.error('Error adding to wishlist:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url || `${this.wishlistBaseUrl}add`,
            error: error.error,
          });
          return of({
            success: false,
            message: 'Failed to add product to wishlist',
          });
        })
      );
  }

  // Remove item from Wishlist using the custom endpoint
  removeFromWishlist(productId: number): Observable<any> {
    if (!this.isLoggedIn()) {
      console.warn('No valid token found, cannot remove from wishlist');
      return of({ success: false, message: 'User not logged in' });
    }

    const headers = this.getAuthHeaders();
    console.log('Removing from wishlist with headers:', headers, 'product_id:', productId);

    return this.apiService
      .deleteExternalRequest(
        `${this.wishlistBaseUrl}remove/${productId}`,
        { headers }
      )
      .pipe(
        tap((response) => console.log('Remove from wishlist response:', response)),
        catchError((error) => {
          console.error('Error removing from wishlist:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url || `${this.wishlistBaseUrl}remove/${productId}`,
            error: error.error,
          });
          return of({
            success: false,
            message: 'Failed to remove product from wishlist',
          });
        })
      );
  }

  // Add to Cart
  addToCart(productId: number, quantity: number = 1): Observable<any> {
    return this.apiService
      .postRequest('cart/add', { product_id: productId, quantity })
      .pipe(
        tap((response) => console.log('Add to cart response:', response)),
        catchError((error) => {
          console.error('Error adding to cart:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            error: error.error,
          });
          return of({
            success: false,
            message: 'Failed to add product to cart',
          });
        })
      );
  }

  // Get Customer ID from AccountAuthService
  getCustomerId(): number | null {
    const customerIdStr = this.accountAuthService.getUserId();
    return customerIdStr ? parseInt(customerIdStr, 10) : null;
  }

  // Get current user data
  getCurrentUser(): any {
    return this.accountAuthService.getUser();
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = this.localStorageService.getItem('auth_token');
    const isValid = !!token;
    console.log('isLoggedIn:', isValid, 'Token:', token ? 'exists' : 'missing');
    return isValid;
  }

  // Log out
  logout(): void {
    this.accountAuthService.logout();
  }

  // Helper method to get JWT headers
  private getAuthHeaders(): { [key: string]: string } {
    const token = this.localStorageService.getItem('auth_token');
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  }

  // Other methods (unchanged)
  getOrders(customerId: number): Observable<any> {
    const params = new HttpParams().set('customer', customerId.toString());
    return this.apiService.getRequest('orders', { params });
  }

  getOrderDetails(orderId: number): Observable<any> {
    return this.apiService.getRequest(`orders/${orderId}`);
  }

  getDownloads(customerId: number): Observable<any> {
    return this.apiService.getRequest(`customers/${customerId}/downloads`);
  }

  getCustomerDetails(customerId: number): Observable<any> {
    return this.apiService.getRequest(`customers/${customerId}`);
  }

  updateCustomerDetails(customerId: number, customerData: any): Observable<any> {
    return this.apiService.putRequest(`customers/${customerId}`, customerData);
  }

  updateBillingAddress(customerId: number, billingData: any): Observable<any> {
    const data = { billing: billingData };
    return this.apiService.putRequest(`customers/${customerId}`, data);
  }

  updateShippingAddress(customerId: number, shippingData: any): Observable<any> {
    const data = { shipping: shippingData };
    return this.apiService.putRequest(`customers/${customerId}`, data);
  }

  getPaymentGateways(): Observable<any> {
    return this.apiService.getRequest('payment_gateways');
  }

  updatePaymentMethod(paymentMethodId: string, data: any): Observable<any> {
    return this.apiService.putRequest(`payment_gateways/${paymentMethodId}`, data);
  }

  saveCreditCard(cardData: any): Observable<any> {
    const customerId = this.getCustomerId();
    return of({
      success: true,
      message: 'Credit card saved successfully',
      card: {
        id: 'card_' + Date.now(),
        last4: cardData.card_number.slice(-4),
        brand: 'Visa',
        expiry: cardData.expiry_month + '/' + cardData.expiry_year,
      },
    });
  }
}