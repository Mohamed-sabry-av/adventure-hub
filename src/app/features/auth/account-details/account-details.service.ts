import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LocalStorageService } from '../../../core/services/local-storage.service';
import { AccountAuthService } from '../account-auth.service';
import { environment } from '../../../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class WooCommerceAccountService {
  private wishlistBaseUrl = `${environment.baseUrl}/wp-json/swc/v1/wishlist`; 
  private wcApiUrl = `${environment.baseUrl}/wp-json/wc/v3`; // WooCommerce REST API base URL
  private wooApiUrl = environment.wcStoreApiUrl; // WooCommerce Store API base URL
  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService,
    private accountAuthService: AccountAuthService
  ) {}
  // طريقة بديلة للحصول على الطلبات
  getCustomerOrders(): Observable<any> {
    const userId = this.getCustomerId();
    if (!userId) {
      
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }
    // أولاً، حاول استخدام WC Store API
    const params = new HttpParams().set('customer_id', userId.toString());
    const options = { params };
    return this.apiService
      .getExternalRequest(`${this.wooApiUrl}/orders`, options)
      .pipe(
        catchError(error => {
          
          // حاول استخدام واجهة البرمجة البديلة
          const token = this.accountAuthService.getToken();
          if (!token) {
            return of({ success: false, message: 'Authentication token not found' });
          }
          const alternativeOptions = {
            params,
            headers: { Authorization: `Bearer ${token}` }
          };
          // محاولة استخدام WC REST API
          return this.apiService
            .getExternalRequest(`${this.wcApiUrl}/orders`, alternativeOptions)
            .pipe(
              catchError(err => {
                
                return of({
                  success: false,
                  message: 'Failed to fetch order history',
                  orders: []
                });
              })
            );
        })
      );
  }
  // Get Wishlist
  getWishlist(): Observable<any> {
    const userId = this.getCustomerId();
    if (!this.isLoggedIn() || !userId) {
      
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }
    const params = new HttpParams().set('user_id', userId.toString());
    const options = { params };
    return this.apiService
      .getExternalRequest(this.wishlistBaseUrl, options)
      .pipe(
        catchError((error) => {
          
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
    if (!this.isLoggedIn() || !userId) {
      
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }
    const body = { user_id: userId, product_id: productId };
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers };
    return this.apiService
      .postExternalRequest(`${this.wishlistBaseUrl}/add`, body, options)
      .pipe(
        catchError((error) => {
          
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
    if (!this.isLoggedIn() || !userId) {
      
      return of({ success: false, message: 'User not logged in or invalid user ID' });
    }
    const body = { user_id: userId, product_id: productId };
    const headers = { 'Content-Type': 'application/json' };
    const options = { headers, body };
    return this.apiService
      .deleteExternalRequest(`${this.wishlistBaseUrl}/remove`, options)
      .pipe(
        catchError((error) => {
          
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
    return this.apiService
      .postRequest('cart/add', body)
      .pipe(
        catchError((error) => {
          
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

