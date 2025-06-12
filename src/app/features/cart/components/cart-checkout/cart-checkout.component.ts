import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Observable, Subscription, takeUntil, Subject, of, catchError, finalize, take, filter, map } from 'rxjs';
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
  imports: [RouterLink, AsyncPipe, CurrencySvgPipe, WalletPaymentComponent, NgIf, FormsModule],
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
  cartStatus$: Observable<any> = this.uiService.cartStatus$;
  
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
  
  // New coupon system using checkout service
  couponValue: string = '';
  haveCoupon: boolean = false;
  appliedCouponStatus$: Observable<any> = this.checkoutService.appliedCouponStatus$;
  isCouponLoading$: Observable<boolean> = this.uiService.isCouponLoading$;
  isUsed$: Observable<boolean> = this.checkoutService.emailIsUsed$;
  
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
    
    // Check for applied coupons from the cart service
    const couponSubscription = this.loadedCart$
      .pipe(
        filter((response: any) => response?.userCart?.coupons),
        map((res: any) => {
          const coupons = res.userCart.coupons || {};
          const couponKeys = Object.keys(coupons);

          const couponData =
            couponKeys.length > 0 ? coupons[couponKeys[0]] : null;

          if (couponData !== null) {
            this.haveCoupon = true;
          } else {
            this.haveCoupon = false;
          }

          this.couponValue = couponData?.code || '';
          return res.userCart;
        })
      )
      .subscribe();
      
    this.subscriptions.add(couponSubscription);
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
    // Keep this method for backward compatibility
    this.isCouponVisible = !this.isCouponVisible;
    if (!this.isCouponVisible) {
      this.couponCode = '';
      this.couponError = null;
    }
  }
  
  applyCoupon() {
    // Redirect to the new method using checkout service
    if (!this.couponCode.trim()) {
      this.couponError = 'Please enter a valid coupon code';
      return;
    }
    
    this.couponValue = this.couponCode.trim();
    this.onApplyCoupon();
    this.isCouponVisible = false;
  }
  
  removeCoupon() {
    // Redirect to the new method using checkout service
    this.onRemoveCoupon();
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
        
        return of(null);
      })
    ).subscribe();
  }
  
  calculateTotal(): number {
    let total = this.cartTotal;
    
    // Get the latest cart data with applied coupon discounts
    let cartData: any = null;
    this.loadedCart$.pipe(take(1)).subscribe(data => {
      cartData = data?.userCart;
    });
    
    // Use the total from the cart data if available (includes coupon discounts)
    if (cartData?.totals?.total_price) {
      total = typeof cartData.totals.total_price === 'string'
        ? parseFloat(cartData.totals.total_price.replace(/[^0-9.]/g, ''))
        : cartData.totals.total_price;
    } else if (this.discountAmount > 0) {
      // Fallback to manual calculation if cart total doesn't include discount
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

  // Get discount amount from applied coupon
  getDiscountAmount(): number {
    let discount = 0;
    let cartData: any = null;
    
    // Get the latest cart data
    this.loadedCart$.pipe(take(1)).subscribe(data => {
      cartData = data?.userCart;
    });
    
    // Check if there are any coupons applied
    if (cartData?.coupons) {
      const coupons = cartData.coupons || {};
      const couponKeys = Object.keys(coupons);
      
      if (couponKeys.length > 0) {
        const couponData = coupons[couponKeys[0]];
        if (couponData) {
          // Try to get discount from different possible properties
          if (couponData.discount) {
            discount = parseFloat(couponData.discount);
          } else if (couponData.discount_amount) {
            discount = parseFloat(couponData.discount_amount);
          } else if (couponData.amount) {
            discount = parseFloat(couponData.amount);
          }
        }
      }
    } 
    
    // Calculate discount from totals if available
    if (discount === 0 && cartData?.totals) {
      // If there's a difference between subtotal and total, it might be the discount
      const subtotal = parseFloat(cartData.totals.sub_total?.toString().replace(/[^0-9.]/g, '') || '0');
      const total = parseFloat(cartData.totals.total_price?.toString().replace(/[^0-9.]/g, '') || '0');
      
      if (subtotal > total) {
        discount = subtotal - total;
      }
    }
    
    // Fallback to the component's discount amount
    if (discount === 0 && this.discountAmount > 0) {
      discount = this.discountAmount;
    }
    
    return discount;
  }
  
  // Get coupon type (percentage or fixed amount)
  getCouponType(): string {
    let couponType = '';
    let cartData: any = null;
    
    // Get the latest cart data
    this.loadedCart$.pipe(take(1)).subscribe(data => {
      cartData = data?.userCart;
    });
    
    // Check if there are any coupons applied
    if (cartData?.coupons) {
      const coupons = cartData.coupons || {};
      const couponKeys = Object.keys(coupons);
      
      if (couponKeys.length > 0) {
        const couponData = coupons[couponKeys[0]];
        if (couponData) {
          // Check coupon type
          if (couponData.discount_type) {
            couponType = couponData.discount_type;
          } else if (couponData.type) {
            couponType = couponData.type;
          }
        }
      }
    }
    
    return couponType;
  }
  
  // Get applied coupon code
  getCouponCode(): string {
    let couponCode = '';
    let cartData: any = null;
    
    // Get the latest cart data
    this.loadedCart$.pipe(take(1)).subscribe(data => {
      cartData = data?.userCart;
    });
    
    // Check if there are any coupons applied
    if (cartData?.coupons) {
      const coupons = cartData.coupons || {};
      const couponKeys = Object.keys(coupons);
      
      if (couponKeys.length > 0) {
        const couponData = coupons[couponKeys[0]];
        if (couponData && couponData.code) {
          couponCode = couponData.code;
        }
      }
    }
    
    return couponCode;
  }

  // New coupon methods using checkout service
  onApplyCoupon() {
    this.checkoutService.applyCoupon(this.couponValue);
  }
  
  onRemoveCoupon() {
    this.checkoutService.removeCoupon(this.couponValue);
  }
}
