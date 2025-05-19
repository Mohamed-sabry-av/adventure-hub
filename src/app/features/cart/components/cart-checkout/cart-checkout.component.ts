import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, takeUntil, Subject, of, catchError, finalize, take } from 'rxjs';
import { CartService } from '../../service/cart.service';
import { CurrencySvgPipe } from '../../../../shared/pipes/currency.pipe';
import { WalletPaymentComponent } from '../../../checkout/component/googlePay-button/google-pay-button.component';
import { UIService } from '../../../../shared/services/ui.service';
import { AccountAuthService } from '../../../auth/account-auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { CheckoutService } from '../../../checkout/services/checkout.service';

interface CouponData {
  code: string;
  discount_amount: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
}

interface UserAddress {
  country: string;
  city: string;
  address: string;
  postal_code: string;
}

@Component({
  selector: 'app-cart-checkout',
  imports: [RouterLink, AsyncPipe, CurrencySvgPipe, WalletPaymentComponent, NgIf],
  templateUrl: './cart-checkout.component.html',
  styleUrl: './cart-checkout.component.css',

  animations: [
    trigger('toggleTextarea', [
      state(
        'hidden',
        style({
          height: '0px',
          opacity: 0,
          overflow: 'hidden',
          padding: '0px',
        })
      ),
      state(
        'visible',
        style({
          height: '96px',
          opacity: 1,
          padding: '8px',
        })
      ),
      transition('hidden <=> visible', animate('0.3s ease-in-out')),
    ]),
  ],
})
export class CartCheckoutComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private uiService = inject(UIService);
  private router = inject(Router);
  public authService = inject(AccountAuthService);
  private http = inject(HttpClient);
  private accountService = inject(WooCommerceAccountService);
  private checkoutService = inject(CheckoutService);

  private destroy$ = new Subject<void>();
  private subscriptions = new Subscription();

  // Cart data
  loadedCart$: Observable<any> = this.cartService.savedUserCart$;
  cartTotal: number = 0;
  
  // Error handling
  loadingError: boolean = false;
  errorMessage: string = '';
  
  // Wallet payment
  showWalletPayment = false;
  walletPaymentAttempted = false;
  
  // Coupon system
  isCouponVisible = false;
  couponCode = '';
  isApplyingCoupon = false;
  appliedCoupon: CouponData | null = null;
  couponError: string | null = null;
  discountAmount = 0;
  
  // Shipping calculation
  isLoadingShipping = true;
  isFreeShipping = false;
  isInternationalShipping = false;
  shippingError: string | null = null;
  userAddress: UserAddress | null = null;
  
  // UI state
  isTextareaVisible = false;

  ngOnInit() {
    // Initialize the wallet payment status from CheckoutService
    this.subscriptions.add(
      this.checkoutService.walletPaymentAvailable$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(available => {
        this.showWalletPayment = available;
        this.walletPaymentAttempted = true;
      })
    );
    
    // Load cart data
    this.subscriptions.add(
      this.loadedCart$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(
        cartData => {
          if (cartData?.cartIsLoaded && cartData?.userCart) {
            // Extract cart total
            this.cartTotal = this.extractCartTotal(cartData.userCart);
            
            // Check if cart qualifies for free shipping
            this.checkFreeShipping();
            
            // Clear loading state
            this.loadingError = false;
          }
        },
        error => {
          this.loadingError = true;
          this.errorMessage = 'Failed to load cart data. Please try again.';
          console.error('Cart loading error:', error);
        }
      )
    );
    
    // Check if user is logged in to get address for shipping calculation
    this.subscriptions.add(
      this.authService.isLoggedIn$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(isLoggedIn => {
        if (isLoggedIn) {
          this.loadUserAddressFromAccount();
        } else {
          // No user is logged in, use default shipping options
          this.isLoadingShipping = false;
          this.isFreeShipping = this.cartTotal >= 100;
        }
      })
    );
    
    // Check for any saved coupons in local storage or from previous sessions
    this.checkForSavedCoupons();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.unsubscribe();
  }

  toggleTextarea() {
    this.isTextareaVisible = !this.isTextareaVisible;
  }
  
  toggleCoupon() {
    this.isCouponVisible = !this.isCouponVisible;
    if (!this.isCouponVisible) {
      this.couponCode = '';
      this.couponError = null;
    }
  }
  
  applyCoupon() {
    if (!this.couponCode.trim()) {
      this.couponError = 'Please enter a valid coupon code';
      return;
    }
    
    this.isApplyingCoupon = true;
    this.couponError = null;
    
    // Call API to validate coupon
    this.http.post<any>(`${environment.apiUrl}/api/validate-coupon`, {
      code: this.couponCode.trim(),
      cart_total: this.cartTotal
    }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Coupon validation error:', error);
        this.couponError = error.error?.message || 'Failed to validate coupon. Please try again.';
        return of(null);
      }),
      finalize(() => {
        this.isApplyingCoupon = false;
      })
    ).subscribe(response => {
      if (response && response.success) {
        this.appliedCoupon = {
          code: this.couponCode.trim(),
          discount_amount: response.discount_amount,
          discount_type: response.discount_type,
          discount_value: response.discount_value
        };
        
        this.discountAmount = response.discount_amount;
        this.couponCode = '';
        this.isCouponVisible = false;
        
        // Save coupon to local storage or session
        this.saveCouponToStorage();
        
        // Recalculate shipping eligibility
        this.checkFreeShipping();
      } else if (!this.couponError) {
        this.couponError = 'Invalid coupon code or coupon is expired';
      }
    });
  }
  
  removeCoupon() {
    this.appliedCoupon = null;
    this.discountAmount = 0;
    
    // Remove from storage
    localStorage.removeItem('appliedCoupon');
    
    // Recalculate shipping eligibility
    this.checkFreeShipping();
  }
  
  loadUserAddressFromAccount() {
    this.isLoadingShipping = true;
    
    // Get customer ID
    const customerId = this.accountService.getCustomerId();
    
    if (!customerId) {
      this.handleAddressError('User ID not found');
      return;
    }
    
    // Get customer details including shipping address
    this.accountService.getCustomerDetails(customerId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        this.handleAddressError('Unable to load your address information');
        console.error('Error loading user details:', error);
        return of(null);
      })
    ).subscribe(customerData => {
      this.isLoadingShipping = false;
      
      if (customerData && customerData.shipping) {
        const shipping = customerData.shipping;
        
        this.userAddress = {
          country: shipping.country || 'AE',
          city: shipping.city || '',
          address: shipping.address_1 || '',
          postal_code: shipping.postcode || ''
        };
        
        // Check if user is in UAE or international
        this.isInternationalShipping = this.userAddress.country !== 'AE';
        this.checkFreeShipping();
      } else {
        // Fallback to billing address if shipping is not available
        if (customerData && customerData.billing) {
          const billing = customerData.billing;
          
          this.userAddress = {
            country: billing.country || 'AE',
            city: billing.city || '',
            address: billing.address_1 || '',
            postal_code: billing.postcode || ''
          };
          
          this.isInternationalShipping = this.userAddress.country !== 'AE';
          this.checkFreeShipping();
        } else {
          // No address found
          this.userAddress = {
            country: 'AE',
            city: '',
            address: '',
            postal_code: ''
          };
          this.isInternationalShipping = false;
          this.checkFreeShipping();
        }
      }
    });
  }
  
  handleAddressError(errorMessage: string) {
    this.shippingError = errorMessage;
    this.isLoadingShipping = false;
    this.userAddress = {
      country: 'AE',
      city: '',
      address: '',
      postal_code: ''
    };
    this.isInternationalShipping = false;
    this.isFreeShipping = this.cartTotal >= 100;
  }
  
  checkFreeShipping() {
    // Check if cart total qualifies for free shipping (over AED 100) for UAE only
    if (this.isInternationalShipping) {
      this.isFreeShipping = false;
    } else {
      this.isFreeShipping = this.cartTotal >= 100;
    }
  }
  
  requestShippingQuote() {
    // Show a popup or navigate to contact form
    this.uiService.showInfo('Our team will contact you shortly for shipping details');
    
    // Could also send an API request to notify team about shipping quote request
    this.http.post(`${environment.apiUrl}/api/shipping-quote-request`, {
      cart_id: this.getCartId(),
      user_email: this.getUserEmail()
    }).pipe(
      catchError(error => {
        console.error('Error requesting shipping quote:', error);
        return of(null);
      })
    ).subscribe();
  }
  
  calculateTotal(): number {
    let total = this.cartTotal;
    
    // Apply discount if coupon is applied
    if (this.discountAmount > 0) {
      total -= this.discountAmount;
    }
    
    // Add shipping fee if applicable
    if (!this.isInternationalShipping && !this.isFreeShipping) {
      total += 20; // AED 20 shipping fee for UAE orders under AED 100
    }
    
    return Math.max(0, Math.round(total * 100) / 100);
  }
  
  getShippingOptions() {
    // Return shipping options for wallet payment
    if (this.isInternationalShipping) {
      return [
        {
          id: 'international',
          label: 'International Shipping',
          amount: 0, // This will be determined later
          detail: 'Our team will contact you for shipping details'
        }
      ];
    } else if (this.isFreeShipping) {
      return [
        {
          id: 'free',
          label: 'Free Shipping',
          amount: 0,
          detail: 'Delivery within 3-5 business days'
        }
      ];
    } else {
      return [
        {
          id: 'standard',
          label: 'Standard Shipping',
          amount: 2000, // AED 20 in fils
          detail: 'Delivery within 3-5 business days'
        }
      ];
    }
  }
  
  onPaymentSuccess(paymentIntentId: string) {
    // Show success message
    this.uiService.showSuccess('Payment successful! Redirecting to confirmation page...');
    
    // Redirect to order confirmation or similar page
    setTimeout(() => {
      // Clear cart after successful payment
      this.cartService.clearUserCart();
      
      // Navigate to order confirmation with order ID
      this.router.navigate(['/order-received', paymentIntentId]);
    }, 1500);
  }
  
  // Helper methods
  private extractCartTotal(cartData: any): number {
    // Extract total from cart data
    if (cartData?.totals?.sub_total) {
      const total = typeof cartData.totals.sub_total === 'string' 
        ? parseFloat(cartData.totals.sub_total.replace(/[^0-9.]/g, ''))
        : cartData.totals.sub_total;
      return total || 0;
    }
    return 0;
  }
  
  private checkForSavedCoupons() {
    // Check localStorage for any saved coupons
    const savedCoupon = localStorage.getItem('appliedCoupon');
    if (savedCoupon) {
      try {
        this.appliedCoupon = JSON.parse(savedCoupon);
        if (this.appliedCoupon) {
          this.discountAmount = this.appliedCoupon.discount_amount;
        }
      } catch (e) {
        console.error('Error parsing saved coupon', e);
        localStorage.removeItem('appliedCoupon');
      }
    }
  }
  
  private saveCouponToStorage() {
    if (this.appliedCoupon) {
      localStorage.setItem('appliedCoupon', JSON.stringify(this.appliedCoupon));
    }
  }
  
  private getCartId(): string {
    const cartData = localStorage.getItem('cartId');
    return cartData ? JSON.parse(cartData) : '';
  }
  
  private getUserEmail(): string {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.email || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  }

  // Add retryLoadingAddress method
  retryLoadingAddress() {
    // Reset error state
    this.shippingError = null;
    this.isLoadingShipping = true;
    
    // Try to load address again
    this.authService.isLoggedIn$.pipe(
      take(1)
    ).subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadUserAddressFromAccount();
      } else {
        // No user is logged in, use default shipping options
        this.isLoadingShipping = false;
        this.isFreeShipping = this.cartTotal >= 100;
      }
    });
  }
}
