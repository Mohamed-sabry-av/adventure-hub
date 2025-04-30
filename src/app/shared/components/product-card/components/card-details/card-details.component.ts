import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../../interfaces/product';
import { RouterLink } from '@angular/router';
import { CurrencySvgPipe } from '../../../../pipes/currency.pipe';

@Component({
  selector: 'app-card-details',
  standalone: true,
  imports: [CommonModule, RouterLink,CurrencySvgPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.css'],
})
export class CardDetailsComponent {
  @Input() product!: Product;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] =
    [];
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() getBrandName!: () => string | null;
  @Input() getBrandSlug!: () => string | null;
  @Input() selectedVariation: any;

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
