import { Injectable } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { Product, Variation } from '../../interfaces/product';

@Injectable({
  providedIn: 'root',
})
export class ProductCardService {
  constructor(private productService: ProductService) {}

  async fetchVariations(productId: number): Promise<Variation[]> {
    try {
      const variations = await this.productService.getProductVariations(productId).toPromise();
      return variations || [];
    } catch (error) {
      console.error('Error fetching variations:', error);
      return [];
    }
  }

  getColorOptions(variations: Variation[]): { color: string; image: string; inStock: boolean }[] {
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    variations.forEach((v) => {
      const colorAttr = v.attributes.find((attr: any) => attr.name === 'Color');
      if (colorAttr && v.image?.src) {
        const inStock = v.stock_status === 'instock';
        if (!colorMap.has(colorAttr.option) || inStock) {
          colorMap.set(colorAttr.option, { image: v.image.src, inStock });
        }
      }
    });
    const options = Array.from(colorMap, ([color, data]) => ({
      color,
      image: data.image,
      inStock: data.inStock,
    }));
    return options.length > 1 ? options : [];
  }

  getSizesForColor(variations: Variation[], color: string): { size: string; inStock: boolean }[] {
    const sizesMap = new Map<string, boolean>();
    const filteredVariations = color
      ? variations.filter((v) => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      : variations;

    filteredVariations.forEach((v) => {
      const sizeAttr = v.attributes.find((attr: any) => attr.name === 'Size');
      if (sizeAttr) {
        const inStock = v.stock_status === 'instock';
        if (!sizesMap.has(sizeAttr.option) || inStock) {
          sizesMap.set(sizeAttr.option, inStock);
        }
      }
    });

    return Array.from(sizesMap, ([size, inStock]) => ({ size, inStock })).sort((a, b) => {
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      const aNum = Number(a.size);
      const bNum = Number(b.size);
      return !isNaN(aNum) && !isNaN(bNum) ? aNum - bNum : a.size.localeCompare(b.size);
    });
  }

  getBrandName(product: Product): string | null {
    const brandAttr = product?.attributes?.find((attr) => attr.name === 'Brand');
    if (brandAttr?.options?.length) {
      const option = brandAttr.options[0];
      return typeof option === 'string' ? option : option?.name || option.value || null;
    }
    return null;
  }

  getBrandSlug(product: Product): string | null {
    const brandAttr = product?.attributes?.find((attr) => attr.name === 'Brand');
    if (brandAttr?.options?.length) {
      const option = brandAttr.options[0];
      return typeof option === 'string' ? null : option?.slug || null;
    }
    return null;
  }
}