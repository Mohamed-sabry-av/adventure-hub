import { Component, EventEmitter, Output, ViewChild, ElementRef, inject, AfterViewInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Stripe, StripeElements, StripePaymentRequestButtonElement } from '@stripe/stripe-js';
import { CheckoutService } from '../../services/checkout.service';
import { StripeService } from '../../services/stripe.service';
import { take } from 'rxjs/operators';
import { WooCommerceAccountService } from '../../../auth/account-details/account-details.service';
import { AccountAuthService } from '../../../auth/account-auth.service';

interface ShippingOption {
  id: string;
  label: string;
  amount: number;
  detail: string;
}

@Component({
  selector: 'app-wallet-payment',
  template: `
    <div #googlePayButtonElement class="mb-4 md:w-[490px] mx-auto"></div>
  `,
  styles: []
})
export class WalletPaymentComponent implements AfterViewInit, OnChanges {
  private checkoutService = inject(CheckoutService);
  private stripeService = inject(StripeService);
  private accountService = inject(WooCommerceAccountService);
  private authService = inject(AccountAuthService);
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private paymentRequest: any;
  private prButton: StripePaymentRequestButtonElement | null = null;
  public googlePaySupported = false;
  public applePaySupported = false;
  private previousProductPrice: string | null = null;
  
  // User details for pre-filling
  private userDetails: any = null;

  @Input() product: any; // Optional: Single product for direct purchase
  @Input() shippingOptions: ShippingOption[] = [];
  @ViewChild('googlePayButtonElement') googlePayButtonRef!: ElementRef;
  @Output() paymentSucceeded = new EventEmitter<string>();

  constructor() {
    // Set wallet payment availability to false by default
    this.checkoutService.walletPaymentAvailable$.next(false);
  }

  async ngAfterViewInit() {
    // Try to load user details if user is logged in
    this.loadUserDetails();
    await this.initStripe();
  }

  // Detect changes to the product input, especially price changes
  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && !changes['product'].firstChange) {
      const currentPrice = this.product?.price;
      // Only reinitialize if price has changed
      if (currentPrice !== this.previousProductPrice && this.stripe && this.elements) {
        this.previousProductPrice = currentPrice;
        // Re-initialize payment request with updated price
        this.initWalletPayments();
      }
    }
  }
  
  private async loadUserDetails() {
    // Check if user is logged in
    if (this.accountService.isLoggedIn()) {
      const userId = this.accountService.getCustomerId();
      if (userId) {
        try {
          this.userDetails = await this.accountService.getCustomerDetails(userId)
            .pipe(take(1))
            .toPromise();

        } catch (error) {
          
        }
      }
    }
  }

  private async initStripe() {
    this.stripe = await this.stripeService.getStripe();
    if (this.stripe) {
      this.elements = this.stripe.elements();
      await this.initWalletPayments();
    }
  }

  private normalizePrice(value: any): number {
    const cleanedValue = value ? String(value).replace(/[^0-9.]/g, '') : '0';
    return parseFloat(cleanedValue) || 0;
  }

  private async initWalletPayments() {
    if (!this.stripe || !this.elements || !this.googlePayButtonRef) {
      
      this.checkoutService.walletPaymentAvailable$.next(false);
      return;
    }

    // Clean up previous button if it exists
    if (this.prButton) {
      this.prButton.destroy();
      this.prButton = null;
    }

    try {
      let total: number;
      let currency: string;
      let paymentLabel: string = 'Your purchase';

      if (this.product) {
        // Direct purchase: Use product price
        if (!this.product.id || !this.product.price || !this.product.quantity) {
          throw new Error('Invalid product data: id, price, or quantity missing');
        }
        if (this.product.stock_status !== 'instock') {
          throw new Error('Product is out of stock');
        }
        total = this.normalizePrice(this.product.price) * this.product.quantity;
        // Store the current price for comparison in ngOnChanges
        this.previousProductPrice = this.product.price;
        currency = 'aed'; // Adjust based on your store's currency
        
        // Ensure we have a valid product name for the label
        if (this.product.name) {
          paymentLabel = this.product.name;
        } else if (this.product.parent_name) {
          paymentLabel = this.product.parent_name;
        }
      } else {
        // Cart-based purchase
        const cartTotal = await this.checkoutService.getCartTotalPrice().pipe(take(1)).toPromise();
        if (!cartTotal) {
          throw new Error('Cart total is not available');
        }
        total = cartTotal.total;
        currency = cartTotal.currency.toLowerCase();
        paymentLabel = 'Cart Total';
      }

      if (total <= 0) {
        throw new Error('Invalid total amount: must be greater than 0');
      }

      const amountInFils = Math.round(total * 100);

      // Use provided shipping options or default
      const shippingOptionsToUse = this.shippingOptions && this.shippingOptions.length > 0
        ? this.shippingOptions
        : [
            {
              id: 'standard',
              label: 'Standard Shipping',
              amount: 0,
              detail: 'Delivery within 3-5 business days',
            },
          ];

      const paymentRequestConfig: any = {
        country: 'AE',
        currency: currency,
        total: {
          label: paymentLabel,
          amount: amountInFils,
        },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
        requestShipping: true,
        shippingOptions: shippingOptionsToUse,
      };

      // Add pre-filled data if user details are available
      if (this.userDetails) {
        // Add email from user details if available
        if (this.userDetails.email) {
          paymentRequestConfig.emailRequired = true;
          paymentRequestConfig.email = this.userDetails.email;
        }

        // Add shipping address if available
        if (this.userDetails.shipping && 
            this.userDetails.shipping.address_1 && 
            this.userDetails.shipping.country) {
          const shipping = this.userDetails.shipping;
          
          paymentRequestConfig.shippingAddressRequired = true;
          paymentRequestConfig.shippingAddress = {
            addressLine: [shipping.address_1, shipping.address_2].filter(Boolean),
            city: shipping.city || '',
            country: shipping.country || 'AE',
            postalCode: shipping.postcode || '',
            recipient: `${shipping.first_name || ''} ${shipping.last_name || ''}`.trim(),
            region: shipping.state || '',
            sortingCode: '',
            dependentLocality: '',
            organization: '',
            phone: this.userDetails.billing?.phone || '',
          };
        }
      }

      this.paymentRequest = this.stripe.paymentRequest(paymentRequestConfig);

      const result = await this.paymentRequest.canMakePayment();
      if (result) {
        if (result.applePay) {
          this.applePaySupported = true;
        }
        if (result.googlePay) {
          this.googlePaySupported = true;
        }

        // Set wallet payment availability status in the CheckoutService
        this.checkoutService.walletPaymentAvailable$.next(true);

        this.prButton = this.elements.create('paymentRequestButton', {
          paymentRequest: this.paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'default',
              theme: 'dark',
              height: '40px',
            },
          },
        });

        this.prButton.mount(this.googlePayButtonRef.nativeElement);

        this.paymentRequest.on('paymentmethod', async (event: any) => {
          try {
            const billingDetails = event.paymentMethod.billing_details || {};
            const shippingAddress = event.shippingAddress || {};

            const orderData = this.prepareOrderData(billingDetails, shippingAddress);

            const paymentIntentResponse = await this.checkoutService
              .createPaymentIntent(total, currency, orderData)
              .pipe(take(1))
              .toPromise();

            if (!paymentIntentResponse?.success || !paymentIntentResponse.clientSecret) {
              throw new Error('Failed to create payment intent');
            }

            const clientSecret = paymentIntentResponse.clientSecret;
            const paymentIntentId = paymentIntentResponse.paymentIntentId;

            const { error, paymentIntent } = await this.stripe!.confirmCardPayment(clientSecret, {
              payment_method: event.paymentMethod.id,
            });

            if (error) {
              
              event.complete('fail');
              return;
            }

            if (paymentIntent && paymentIntent.status === 'succeeded') {

              event.complete('success');
              this.paymentSucceeded.emit(paymentIntentId);
            } else {
              event.complete('fail');
            }
          } catch (error: any) {
            
            event.complete('fail');
          }
        });

        this.paymentRequest.on('shippingaddresschange', async (event: any) => {
          try {
            // Extract address details
            const shippingAddress = event.shippingAddress || {};
            const countryCode = shippingAddress.country || 'AE';
            
            // Set the selected shipping country in the checkout service
            this.checkoutService.getSelectedShippingCountry(countryCode);
            
            // International shipping
            if (countryCode !== 'AE') {
              event.updateWith({
                status: 'success',
                shippingOptions: [{
                  id: 'international',
                  label: 'International Shipping',
                  amount: 0,
                  detail: 'Our team will contact you for shipping details'
                }]
              });
            } else {
              // Update cart total for UAE shipping calculation
              const cartTotal = await this.checkoutService.getCartTotalPrice().pipe(take(1)).toPromise();
              const currentTotal = cartTotal ? cartTotal.total : (total / 100);
              const currentAmountInFils = Math.round(currentTotal * 100);
              const freeShippingThreshold = 10000; // AED 100 in fils
              
              if (currentAmountInFils >= freeShippingThreshold) {
                event.updateWith({
                  status: 'success',
                  shippingOptions: [{
                    id: 'free',
                    label: 'Free Shipping',
                    amount: 0,
                    detail: 'Delivery within 3-5 business days'
                  }]
                });
              } else {
                event.updateWith({
                  status: 'success',
                  shippingOptions: [{
                    id: 'standard',
                    label: 'Standard Shipping',
                    amount: 2000, // AED 20 in fils
                    detail: 'Delivery within 3-5 business days'
                  }]
                });
              }
            }
          } catch (error) {
            
            // Provide default shipping options on error
          event.updateWith({
            status: 'success',
              shippingOptions: [{
                id: 'standard',
                label: 'Standard Shipping',
                amount: 2000,
                detail: 'Delivery within 3-5 business days'
              }]
          });
          }
        });
      } else {

      }
    } catch (error) {
      
    }
  }

  private prepareOrderData(billingDetails: any, shippingAddress: any) {

    let billing: any = {};
    let shipping: any = {};
    
    // Get the shipping country from address
    const shippingCountry = shippingAddress?.country || 'AE';
    
    // Update checkout service with shipping country
    this.checkoutService.getSelectedShippingCountry(shippingCountry);
    
    // First try to use logged-in user details if available
    if (this.userDetails) {
      // Use billing from account if available
      if (this.userDetails.billing) {
        billing = {
          ...this.userDetails.billing,
          email: this.userDetails.email || billingDetails?.email || '',
          phone: this.userDetails.billing.phone || billingDetails?.phone || '',
        };
      }
      
      // Use shipping from account if available
      if (this.userDetails.shipping) {
        // Ensure we use the selected country from the wallet
        shipping = { 
          ...this.userDetails.shipping,
          country: shippingCountry 
        };
      }
    }
    
    // Safely extract name parts from wallet
    let firstName = 'Customer';
    let lastName = '';
    
    if (billingDetails?.name) {
      const nameParts = billingDetails.name.split(' ');
      if (nameParts.length > 0) {
        firstName = nameParts[0] || 'Customer';
        lastName = nameParts.slice(1).join(' ') || '';
      }
    }
    
    // Extract shipping name parts from wallet
    let shippingFirstName = firstName;
    let shippingLastName = lastName;
    
    if (shippingAddress?.name) {
      const shipNameParts = shippingAddress.name.split(' ');
      if (shipNameParts.length > 0) {
        shippingFirstName = shipNameParts[0] || firstName;
        shippingLastName = shipNameParts.slice(1).join(' ') || lastName;
      }
    }
    
    // Fill in missing billing details from wallet data or default values
    billing = {
      first_name: billing.first_name || firstName,
      last_name: billing.last_name || lastName,
      address_1: billing.address_1 || billingDetails?.address?.line1 || shippingAddress?.addressLine?.[0] || '',
      city: billing.city || billingDetails?.address?.city || shippingAddress?.city || '',
      state: billing.state || billingDetails?.address?.state || shippingAddress?.region || '',
      postcode: billing.postcode || billingDetails?.address?.postal_code || shippingAddress?.postalCode || '',
      country: billing.country || billingDetails?.address?.country || shippingAddress?.country || 'AE',
      email: billing.email || billingDetails?.email || this.userDetails?.email || '',
      phone: billing.phone || billingDetails?.phone || this.userDetails?.billing?.phone || '',
    };
  
    // Fill in missing shipping details
    shipping = {
      first_name: shipping.first_name || shippingFirstName,
      last_name: shipping.last_name || shippingLastName,
      address_1: shipping.address_1 || shippingAddress?.addressLine?.[0] || billingDetails?.address?.line1 || '',
      city: shipping.city || shippingAddress?.city || billingDetails?.address?.city || '',
      state: shipping.state || shippingAddress?.region || billingDetails?.address?.state || '',
      postcode: shipping.postcode || shippingAddress?.postalCode || billingDetails?.address?.postal_code || '',
      country: shippingCountry, // Always use the shipping country from the wallet
    };
  
    // Prepare line items
    let line_items: any[] = [];
    if (this.product) {
      const item: any = {
        product_id: parseInt(this.product.id, 10),
        quantity: parseInt(this.product.quantity, 10),
      };
      if (this.product.variation_id) {
        const variationId = parseInt(this.product.variation_id, 10);
        if (!isNaN(variationId)) {
          item.variation_id = variationId;
        }
      }
      line_items = [item];
    } else {
      // For cart-based checkout, line_items will be handled by the backend
      line_items = [];
    }
  
    // Add user ID if logged in
    const userId = this.accountService.getCustomerId();
    const orderData: any = { billing, shipping, line_items };
    
    if (userId) {
      orderData.customer_id = userId;
    }

    return orderData;
  }
}
