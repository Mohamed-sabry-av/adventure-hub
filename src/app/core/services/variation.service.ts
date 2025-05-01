import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, Variation } from '../../interfaces/product';

@Injectable({
  providedIn: 'root',
})
export class VariationService {
  private selectedVariationSubject = new BehaviorSubject<Variation | null>(null);

  constructor() {}

  /**
   * Extract variations from a product
   */
  getVariationsFromProduct(product: Product): Variation[] {
    if (!product || !product.variations || !Array.isArray(product.variations)) {
      return [];
    }
    return product.variations;
  }

  /**
   * Get all available color options from variations with stock status
   */
  getColorOptions(variations: Variation[]): {
    color: string;
    image: string;
    inStock: boolean;
    variationId?: number;
  }[] {
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return [];
    }

    const colorMap = new Map<string, { image: string; inStock: boolean; variationId?: number }>();

    variations.forEach((v) => {
      const colorAttr = v.attributes?.find(
        (attr: any) => attr.name === 'Color'
      );

      if (colorAttr && v.image?.src) {
        const isInStock = v.stock_status === 'instock';
        const currentValue = colorMap.get(colorAttr.option);

        // Only update if we haven't seen this color, or if this variation is in stock and previous one wasn't
        if (!currentValue || (!currentValue.inStock && isInStock)) {
          colorMap.set(colorAttr.option, {
            image: v.image.src,
            inStock: isInStock,
            variationId: v.id
          });
        }
      }
    });

    return Array.from(colorMap, ([color, data]) => ({
      color,
      image: data.image,
      inStock: data.inStock,
      variationId: data.variationId
    }));
  }

  /**
   * Get available sizes for a specific color
   */
  getSizesForColor(
    variations: Variation[],
    color: string
  ): { size: string; inStock: boolean; variationId?: number }[] {
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return [];
    }

    const sizesMap = new Map<string, { inStock: boolean; variationId?: number }>();
    const filteredVariations = color
      ? variations.filter((v) =>
          v.attributes?.some(
            (attr: any) => attr.name === 'Color' && attr.option === color
          )
        )
      : variations;

    filteredVariations.forEach((v) => {
      const sizeAttr = v.attributes?.find((attr: any) => attr.name === 'Size');
      if (sizeAttr) {
        const inStock = v.stock_status === 'instock';
        const currentValue = sizesMap.get(sizeAttr.option);

        // Only update if we haven't seen this size, or if this variation is in stock and previous one wasn't
        if (!currentValue || (!currentValue.inStock && inStock)) {
          sizesMap.set(sizeAttr.option, {
            inStock: inStock,
            variationId: v.id
          });
        }
      }
    });

    return Array.from(sizesMap, ([size, data]) => ({
      size,
      inStock: data.inStock,
      variationId: data.variationId
    })).sort(
      (a, b) => {
        if (a.inStock && !b.inStock) return -1;
        if (!a.inStock && b.inStock) return 1;
        const aNum = Number(a.size);
        const bNum = Number(b.size);
        return !isNaN(aNum) && !isNaN(bNum)
          ? aNum - bNum
          : a.size.localeCompare(b.size);
      }
    );
  }

  /**
   * Find a specific variation by its attributes
   */
  findVariationByAttributes(
    variations: Variation[],
    selectedAttributes: { [key: string]: string | null }
  ): Variation | null {
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return null;
    }

    const attributeKeys = Object.keys(selectedAttributes).filter(
      (key) => selectedAttributes[key] !== null
    );

    if (attributeKeys.length === 0) {
      return null;
    }

    return variations.find((v) =>
      attributeKeys.every((attrName) =>
        v.attributes?.some(
          (attr:any) => attr.name === attrName && attr.option === selectedAttributes[attrName]
        )
      )
    ) || null;
  }

  /**
   * Format color name for better display
   */
  formatColorName(colorName: string): string {
    if (!colorName) return '';

    // Convert slug format (e.g., "dark-navy") to readable format ("Dark Navy")
    return colorName
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get a variation by ID
   */
  getVariationById(variations: Variation[], variationId: number): Variation | null {
    if (!variations || !Array.isArray(variations) || variations.length === 0) {
      return null;
    }

    return variations.find((v) => v.id === variationId) || null;
  }

  /**
   * Set the currently selected variation
   */
  setSelectedVariation(variation: Variation | null): void {
    this.selectedVariationSubject.next(variation);
  }

  /**
   * Get the currently selected variation as an Observable
   */
  getSelectedVariation(): Observable<Variation | null> {
    return this.selectedVariationSubject.asObservable();
  }

  /**
   * Prepare a product for adding to cart with the selected variation
   */
  prepareProductForCart(product: Product, selectedVariation: Variation | null, quantity: number = 1): any {
    if (!product) {
      return null;
    }

    if (product.type === 'simple' || !selectedVariation) {
      return {
        id: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price,
        image: product.images?.[0]?.src,
        // Send the entire product object for reference if needed
        product: product
      };
    }

    // For variable products, create an object with essential information for the cart
    return {
      id: selectedVariation.id,  // Use the variation ID, not the product ID
      product_id: product.id,    // Include the parent product ID
      name: product.name,
      quantity: quantity,
      price: selectedVariation.price,
      image: selectedVariation.image?.src || product.images?.[0]?.src,
      attributes: selectedVariation.attributes?.reduce((obj: any, attr: any) => {
        obj[attr.name] = attr.option;
        return obj;
      }, {}),
      // Include the entire variation object for reference if needed
      variation: selectedVariation,
      // Include the parent product for reference
      product: product
    };
  }
}
