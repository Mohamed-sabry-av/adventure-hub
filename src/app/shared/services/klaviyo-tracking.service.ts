import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
declare global {
  interface Window {
    _learnq: any[];
  }
}
@Injectable({
  providedIn: 'root'
})
export class KlaviyoTrackingService {
  private platformId = inject(PLATFORM_ID);
  /**
   * Identify a user in Klaviyo
   */
  identifyUser(email: string, firstName?: string, lastName?: string, phone?: string): void {
    if (!isPlatformBrowser(this.platformId) || !email) return;
    try {
      if (window._learnq) {
        const userProperties: any = {
          $email: email,
          $consent: ['email', 'web', 'sms']
        };
        if (firstName) userProperties.$first_name = firstName;
        if (lastName) userProperties.$last_name = lastName;
        if (phone) userProperties.$phone_number = phone;
        window._learnq.push(['identify', userProperties]);
      }
    } catch (e) {
      console.error('Error identifying user in Klaviyo:', e);
    }
  }
  /**
   * Track a generic event in Klaviyo
   */
  trackEvent(eventName: string, properties: any): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      if (window._learnq) {
        window._learnq.push(['track', eventName, properties]);
      }
    } catch (e) {
      console.error(`Error tracking ${eventName} in Klaviyo:`, e);
    }
  }
  /**
   * Track when a user views a product
   */
  trackViewedProduct(product: any): void {
    if (!isPlatformBrowser(this.platformId) || !product) return;
    try {
      const productData = {
        ProductID: product.id,
        ProductName: product.name,
        ProductURL: window.location.href,
        Price: parseFloat(product.price || '0'),
        CompareAtPrice: product.regular_price ? parseFloat(product.regular_price) : undefined,
        Categories: product.categories?.map((cat: any) => cat.name) || [],
        ImageURL: product.images?.[0]?.src || '',
        Brand: this.extractBrandFromProduct(product)
      };
      this.trackEvent('Viewed Product', productData);
    } catch (e) {
      console.error('Error tracking product view in Klaviyo:', e);
    }
  }
  /**
   * Track when a user views a category
   */
  trackViewedCategory(category: any): void {
    if (!isPlatformBrowser(this.platformId) || !category) return;
    try {
      const categoryData = {
        CategoryID: category.id,
        CategoryName: category.name,
        CategoryURL: window.location.href,
        ProductCount: category.productCount || 0
      };
      this.trackEvent('Viewed Category', categoryData);
    } catch (e) {
      console.error('Error tracking category view in Klaviyo:', e);
    }
  }
  /**
   * Track when a user completes a search
   */
  trackSearch(searchTerm: string, resultCount: number): void {
    if (!isPlatformBrowser(this.platformId) || !searchTerm) return;
    try {
      const searchData = {
        SearchTerm: searchTerm,
        ResultCount: resultCount
      };
      this.trackEvent('Searched Site', searchData);
    } catch (e) {
      console.error('Error tracking search in Klaviyo:', e);
    }
  }
  /**
   * Track when a user starts checkout
   */
  trackStartedCheckout(cart: any): void {
    if (!isPlatformBrowser(this.platformId) || !cart) return;
    try {
      const items = cart.items || [];
      const lineItems = items.map((item: any) => ({
        ProductID: item.product_id,
        ProductName: item.product_name || item.name,
        Quantity: item.quantity,
        Price: parseFloat(item.price || '0'),
        RowTotal: parseFloat(item.line_total || '0'),
        Categories: item.categories || [],
        ImageURL: item.image || '',
        ProductURL: item.url || ''
      }));
      const checkoutData = {
        $event_id: `checkout_${Date.now()}`,
        $value: parseFloat(cart.totals?.total || '0'),
        ItemCount: items.length,
        Items: lineItems
      };
      this.trackEvent('Started Checkout', checkoutData);
    } catch (e) {
      console.error('Error tracking checkout started in Klaviyo:', e);
    }
  }
  /**
   * Track when an order is completed
   */
  trackOrderCompleted(order: any): void {
    if (!isPlatformBrowser(this.platformId) || !order) return;
    try {
      const items = order.line_items || [];
      const lineItems = items.map((item: any) => ({
        ProductID: item.product_id,
        ProductName: item.name,
        Quantity: item.quantity,
        Price: parseFloat(item.price || '0'),
        RowTotal: parseFloat(item.total || '0'),
        Categories: item.categories || []
      }));
      const orderData = {
        $event_id: `order_${order.id}`,
        $value: parseFloat(order.total || '0'),
        OrderId: order.id,
        Categories: this.extractCategoriesFromOrder(order),
        ItemNames: items.map((item: any) => item.name),
        Items: lineItems,
        BillingAddress: {
          FirstName: order.billing?.first_name,
          LastName: order.billing?.last_name,
          Address1: order.billing?.address_1,
          Address2: order.billing?.address_2,
          City: order.billing?.city,
          Region: order.billing?.state,
          Country: order.billing?.country,
          Zip: order.billing?.postcode,
          Phone: order.billing?.phone
        },
        ShippingAddress: {
          FirstName: order.shipping?.first_name,
          LastName: order.shipping?.last_name,
          Address1: order.shipping?.address_1,
          Address2: order.shipping?.address_2,
          City: order.shipping?.city,
          Region: order.shipping?.state,
          Country: order.shipping?.country,
          Zip: order.shipping?.postcode
        }
      };
      this.trackEvent('Placed Order', orderData);
      // Also identify the customer if email is available
      if (order.billing?.email) {
        this.identifyUser(
          order.billing.email,
          order.billing.first_name,
          order.billing.last_name,
          order.billing.phone
        );
      }
    } catch (e) {
      console.error('Error tracking order completed in Klaviyo:', e);
    }
  }
  /**
   * Track button clicks and other user interactions
   */
  trackButtonClick(buttonName: string, pageLocation: string, additionalData: any = {}): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const buttonData = {
        ButtonName: buttonName,
        PageLocation: pageLocation,
        PageURL: window.location.href,
        Timestamp: new Date().toISOString(),
        ...additionalData
      };
      this.trackEvent('Button Clicked', buttonData);
    } catch (e) {
      console.error('Error tracking button click in Klaviyo:', e);
    }
  }
  /**
   * Extract brand from product
   */
  private extractBrandFromProduct(product: any): string {
    if (!product) return 'Unknown';
    // Check for brand in attributes
    if (product.attributes) {
      const brandAttr = product.attributes.find((attr: any) => 
        attr.name === 'Brand' || attr.name === 'brand'
      );
      if (brandAttr?.options?.[0]) {
        return brandAttr.options[0];
      }
    }
    // Check for brand in meta data
    if (product.meta_data) {
      const brandMeta = product.meta_data.find((meta: any) => 
        meta.key === '_brand' || meta.key === 'brand'
      );
      if (brandMeta?.value) {
        return brandMeta.value;
      }
    }
    return 'Adventures Hub';
  }
  /**
   * Extract categories from order
   */
  private extractCategoriesFromOrder(order: any): string[] {
    if (!order?.line_items) return [];
    const categories = new Set<string>();
    order.line_items.forEach((item: any) => {
      if (item.categories) {
        item.categories.forEach((cat: string) => categories.add(cat));
      }
    });
    return Array.from(categories);
  }
} 
