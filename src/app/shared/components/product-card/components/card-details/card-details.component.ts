import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../../interfaces/product';
import { RouterLink } from '@angular/router';
import { CurrencySvgPipe } from '../../../../pipes/currency.pipe';
import { CategoriesService } from '../../../../../core/services/categories.service';
import { Observable, firstValueFrom, from, map, of } from 'rxjs';

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
  @Input() selectedVariation: any;

  private categoriesService = inject(CategoriesService);
  private categoryPathArray: string[] | null = null;

  /**
   * Returns an Observable of a full path array for the category route
   * This includes the '/category' prefix and all category segments
   */
  getCategoryRouterPath(): Observable<(string | null)[] | null> {
    if (!this.product.categories || this.product.categories.length === 0) {
      return of(null);
    }

    // If we already have the path array, return it prefixed with '/category'
    if (this.categoryPathArray) {
      return of(['/category', ...this.categoryPathArray]);
    }

    // Calculate the path and return as a router-ready array
    return from(this.calculateCategoryPath()).pipe(
      map(pathSegments => {
        if (!pathSegments) return null;
        return ['/category', ...pathSegments];
      })
    );
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
        return [this.product.categories[0].slug];
      }

      // Build the path segments by traversing the category hierarchy
      const slugs: string[] = [];
      let currentCategory = category;

      // Start with the current category
      slugs.unshift(currentCategory.slug);

      // Add parent categories
      while (currentCategory.parent) {
        const parentCategory = await firstValueFrom(
          this.categoriesService.getCategoryById(currentCategory.parent)
        );

        if (!parentCategory) break;

        slugs.unshift(parentCategory.slug);
        currentCategory = parentCategory;
      }

      // Save the path segments for future use
      this.categoryPathArray = slugs;
      return this.categoryPathArray;
    } catch (error) {
      console.error('Error getting category path:', error);
      return [this.product.categories[0].slug];
    }
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
