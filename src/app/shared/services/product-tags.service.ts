import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ProductTagsService {
  
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Get all relevant tags for a product
   * @param product The product object
   * @param variations Array of variations (optional, for variable products)
   * @returns Array of tags as strings
   */
  getProductTags(product: any, variations: any[] = []): string[] {
    if (!product) {
      console.warn('No product provided to getProductTags');
      return [];
    }

    const tags: string[] = [];
    const seenTags = new Set<string>(); // لتجنب تكرار العلامات

    // Stock status is highest priority
    if (product.type === 'variable' && variations.length > 0) {
      const anyVariationInStock = variations.some(
        (v: any) =>
          v.stock_status === 'instock' &&
          (v.manage_stock ? v.stock_quantity > 0 : true)
      );
      if (!anyVariationInStock && !seenTags.has('SOLD OUT')) {
        tags.push('SOLD OUT');
        seenTags.add('SOLD OUT');
      }
    } else if (product.type === 'simple') {
      const isInStock =
        product.stock_status === 'instock' &&
        (product.manage_stock
          ? (product.stock_quantity ?? 0) > 0
          : true);
      if (!isInStock && !seenTags.has('SOLD OUT')) {
        tags.push('SOLD OUT');
        seenTags.add('SOLD OUT');
      }
    }
    
    // Sale tag - second priority
    if (product.on_sale) {
      const salePercentage = this.getSalePercentage(product);
      if (salePercentage > 0 && !seenTags.has(`-${salePercentage}%`)) {
        tags.push(`-${salePercentage}%`);
        seenTags.add(`-${salePercentage}%`);
      }
    }

    // NEW! tag - third priority
    if (product.date_created) {
      const createdDate = new Date(product.date_created);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 14 && !seenTags.has('NEW!')) {
        tags.push('NEW!');
        seenTags.add('NEW!');
      }
    }

    // HUB tag - always show if present
    if (product.tags && product.tags.length > 0) {
      const hubTag = product.tags.find(
        (tag: any) =>
          tag.name?.toUpperCase() === 'HUB' || tag.slug?.toLowerCase() === 'hub'
      );
      if (hubTag && !seenTags.has('HUB')) {
        tags.push('HUB');
        seenTags.add('HUB');
      }
    }

    // Best Seller tag - lower priority
    const isBestSeller =
      (product.rating_count && product.rating_count > 20) ||
      (product.meta_data &&
        product.meta_data.some(
          (meta: any) => meta.key === '_best_seller' && meta.value === 'yes'
        ));
    if (isBestSeller && !seenTags.has('BESTSELLER') && tags.length < 3) {
      tags.push('BESTSELLER');
      seenTags.add('BESTSELLER');
    }

    // Featured tag - lowest priority
    if (product.featured && !seenTags.has('FEATURED') && tags.length < 3) {
      tags.push('FEATURED');
      seenTags.add('FEATURED');
    }

    // Limit to maximum 3 tags for cleaner display
    return tags.slice(0, 3);
  }

  /**
   * Get CSS class for a tag
   * @param tag The tag string
   * @returns CSS class name for the tag
   */
  getTagClass(tag: string): string {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('new')) return 'tag-new';
    if (tagLower.includes('%')) return 'tag-sale';
    if (tagLower === 'hub') return 'tag-hub';
    if (tagLower === 'featured') return 'tag-featured';
    if (tagLower === 'limited') return 'tag-limited';
    if (tagLower === 'sold out') return 'tag-sold-out';
    if (tagLower === 'bestseller') return 'tag-bestseller';
    return 'tag-default';
  }

  /**
   * Calculate sale percentage
   * @param product The product object
   * @returns Percentage discount as a number
   */
  getSalePercentage(product: any): number {
    if (
      !product ||
      !product.regular_price ||
      !product.sale_price
    ) {
      return 0;
    }

    const regularPrice = parseFloat(product.regular_price);
    const salePrice = parseFloat(product.sale_price);

    if (isNaN(regularPrice) || isNaN(salePrice) || regularPrice === 0) {
      return 0;
    }

    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }

  /**
   * Get optimized image URL
   * @param originalUrl Original image URL
   * @returns Optimized image URL
   */
  getOptimizedImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';

    if (originalUrl.includes('?')) {
      return originalUrl;
    }

    const screenWidth = isPlatformBrowser(this.platformId)
      ? window.innerWidth
      : 1024;
    let imageWidth = 400;

    if (screenWidth < 768) {
      imageWidth = 300;
    } else if (screenWidth < 1024) {
      imageWidth = 350;
    }

    return `${originalUrl}?width=${imageWidth}&quality=80`;
  }
} 