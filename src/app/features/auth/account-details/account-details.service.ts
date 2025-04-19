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
  private wishlistBaseUrl = 'https://adventures-hub.com/wp-json/swc/v1/wishlist'; // Update to your WordPress URL

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService,
    private accountAuthService: AccountAuthService
  ) {}

  // Get Wishlist
  getWishlist(): Observable<any> {
    const userId = this.getCustomerId();
    // console.log('getWishlist: userId=', userId); // Debug log
    if (!this.isLoggedIn() || !userId) {
      console.warn('No valid user ID found, cannot fetch wishlist');
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }

    const params = new HttpParams().set('user_id', userId.toString());
    const options = { params }; // Explicitly set options with params only

    // console.log('getWishlist: Sending request with options=', options); // Debug log

    return this.apiService
      .getExternalRequest(this.wishlistBaseUrl, options)
      .pipe(
        // tap((response) => console.log('Get wishlist response:', response)),
        catchError((error) => {
          console.error('Error fetching wishlist:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url || this.wishlistBaseUrl,
            error: error.error,
          });
          return of({
            success: false,
            message: error.error?.message || 'Failed to fetch wishlist',
          });
        })
      );
  }

  // Add Item to Wishlist
  addToWishlist(productId: number): Observable<any> {
    const userId = this.getCustomerId();
    // console.log('addToWishlist: userId=', userId, 'productId=', productId); // Debug log
    if (!this.isLoggedIn() || !userId) {
      console.warn('No valid user ID found, cannot add to wishlist');
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }

    const body = { user_id: userId, product_id: productId };
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers };

    // console.log('addToWishlist: Sending request with body=', body, 'options=', options); // Debug log

    return this.apiService
      .postExternalRequest(`${this.wishlistBaseUrl}/add`, body, options)
      .pipe(
        // tap((response) => console.log('Add to wishlist response:', response)),
        catchError((error) => {
          console.error('Error adding to wishlist:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url || `${this.wishlistBaseUrl}/add`,
            error: error.error,
          });
          return of({
            success: false,
            message: error.error?.message || 'Failed to add product to wishlist',
          });
        })
      );
  }

  // Remove Item from Wishlist
  removeFromWishlist(productId: number): Observable<any> {
    const userId = this.getCustomerId();
    // console.log('removeFromWishlist: userId=', userId, 'productId=', productId); // Debug log
    if (!this.isLoggedIn() || !userId) {
      console.warn('No valid user ID found, cannot remove from wishlist');
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }

    const body = { user_id: userId, product_id: productId };
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers, body };

    // console.log('removeFromWishlist: Sending request with body=', body, 'options=', options); // Debug log

    return this.apiService
      .deleteExternalRequest(`${this.wishlistBaseUrl}/remove`, options)
      .pipe(
        // tap((response) => console.log('Remove from wishlist response:', response)),
        catchError((error) => {
          console.error('Error removing from wishlist:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url || `${this.wishlistBaseUrl}/remove`,
            error: error.error,
          });
          return of({
            success: false,
            message: error.error?.message || 'Failed to remove product from wishlist',
          });
        })
      );
  }

  // Add to Cart
  addToCart(productId: number, quantity: number = 1): Observable<any> {
    const body = { product_id: productId, quantity };
    // console.log('addToCart: Sending request with body=', body); // Debug log
    return this.apiService
      .postRequest('cart/add', body)
      .pipe(
        // tap((response) => console.log('Add to cart response:', response)),
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
    const userId = customerIdStr ? parseInt(customerIdStr, 10) : null;
    // console.log('getCustomerId: customerIdStr=', customerIdStr, 'userId=', userId); // Debug log
    return userId;
  }

  // Get current user data
  getCurrentUser(): any {
    return this.accountAuthService.getUser();
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const userId = this.getCustomerId();
    const isValid = !!userId;
    // console.log('isLoggedIn:', isValid, 'User ID:', userId || 'missing'); // Debug log
    return isValid;
  }

  // Log out
  logout(): void {
    this.accountAuthService.logout();
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