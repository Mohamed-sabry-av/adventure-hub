import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../../interfaces/product';
import { RouterLink } from '@angular/router';
import { CategoriesService } from '../../../../../core/services/categories.service';
import { Observable, firstValueFrom, from, map, of } from 'rxjs';
import { VariationService } from '../../../../../core/services/variation.service';
import { Variation } from '../../../../../interfaces/product';
import { CurrencySvgPipe } from '../../../../pipes/currency.pipe';

@Component({
  selector: 'app-card-details',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencySvgPipe],

  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.css'],
})
export class CardDetailsComponent {
  @Input() product!: Product;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() getBrandName!: () => string | null;
  @Input() getBrandSlug!: () => string | null;
  @Input() selectedVariation: Variation | null = null;
  @Input() isVariationSelected = false;

  private categoriesService = inject(CategoriesService);
  private variationService = inject(VariationService);
  private categoryPathArray: string[] | null = null;

  /**
   * Returns an Observable of a full path array for the category route
   * This includes all category segments without the '/category' prefix
   */
  getCategoryRouterPath(): Observable<(string | null)[] | null> {
    if (!this.product.categories || this.product.categories.length === 0) {
      return of(null);
    }

    // Return with leading slash for absolute path
    return of(['/', this.product.categories[0].slug]);
  }

  /**
   * Calculate the full category path broken down into segments
   */
  private async calculateCategoryPath(): Promise<string[] | null> {
    try {
      const category = await firstValueFrom(
        this.categoriesService.getCategoryBySlugDirect(this.product.categories[0].slug)
      );

      if (!category) {
        return ['/', this.product.categories[0].slug];
      }

      // Build the path segments by traversing the category hierarchy
      const slugs: string[] = ['/'];
      let currentCategory = category;

      // Start with the current category
      slugs.push(currentCategory.slug);

      // Add parent categories
      while (currentCategory.parent) {
        const parentCategory = await firstValueFrom(
          this.categoriesService.getCategoryById(currentCategory.parent)
        );

        if (!parentCategory) break;

        // Insert parent slug after the leading slash
        slugs.splice(1, 0, parentCategory.slug);
        currentCategory = parentCategory;
      }

      // Save the path segments for future use
      this.categoryPathArray = slugs;
      return this.categoryPathArray;
    } catch (error) {
      
      return ['/', this.product.categories[0].slug];
    }
  }

  /**
   * Convert price string to numeric value for currency directive
   */
  getNumericPrice(price: string | null): number {
    if (!price || price === 'Unavailable') return 0;
    // Remove any non-numeric characters except decimal point
    const numericString = price.toString().replace(/[^0-9.]/g, '');
    const numeric = parseFloat(numericString);
    return isNaN(numeric) ? 0 : numeric;
  }

  get displayPrice(): string {
    const variation = this.selectedVariation;

    if (
      variation?.sale_price &&
      variation?.sale_price !== variation?.regular_price
    ) {
      return `${variation.sale_price}`;
    }

    if (variation?.regular_price) {
      return `${variation.regular_price}`;
    }

    if (variation?.price) {
      return `${variation.price}`;
    }

    // Fallback to product price
    return `${
      this.product.sale_price ||
      this.product.regular_price ||
      this.product.price ||
      'Unavailable'
    }`;
  }

  get oldPrice(): string | null {
    const variation = this.selectedVariation;

    if (
      variation?.sale_price &&
      variation?.regular_price &&
      variation?.sale_price !== variation?.regular_price
    ) {
      return `${variation.regular_price}`;
    }

    if (
      this.product.sale_price &&
      this.product.regular_price &&
      this.product.sale_price !== this.product.regular_price
    ) {
      return `${this.product.regular_price}`;
    }

    return null;
  }
}
