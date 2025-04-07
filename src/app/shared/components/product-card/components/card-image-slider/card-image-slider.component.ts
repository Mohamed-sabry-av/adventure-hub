import { Component, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../../interfaces/product';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-card-image-slider',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './card-image-slider.component.html',
  styleUrls: ['./card-image-slider.component.css'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ])
    ])
  ]
})
export class CardImageSliderComponent {
  @Input() product!: Product;
  @Input() currentSlide: number = 0;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() getDotCount!: () => number[];
  @Output() goToSlide = new EventEmitter<number>();
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  onGoToSlide(index: number): void {
    this.goToSlide.emit(index);
  }

  getProductTags(): string[] {
    const tags: string[] = [];

    // Check if product is new (e.g., added in the last 14 days)
    if (this.product.date_created) {
      const createdDate = new Date(this.product.date_created);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 14) {
        tags.push('NEW!');
      }
    }

    // Check if product is on sale
    if (this.product.on_sale) {
      const salePercentage = this.getSalePercentage();
      tags.push(`-${salePercentage}%`);
    }

    // Check if product is featured
    if (this.product.featured) {
      tags.push('FEATURED');
    }

    // Check for low stock
    if (this.product.stock_quantity !== null &&
        this.product.stock_quantity !== undefined &&
        this.product.stock_quantity < 5 &&
        this.product.stock_quantity > 0) {
      tags.push('LIMITED');
    }

    // Check if product is out of stock
    if (this.product.stock_status === 'outofstock') {
      tags.push('SOLD OUT');
    }

    // Check for best seller based on rating count or meta data
    const isBestSeller =
      (this.product.rating_count && this.product.rating_count > 20) ||
      (this.product.meta_data && this.product.meta_data.some(meta =>
        meta.key === '_best_seller' && meta.value === 'yes'));

    if (isBestSeller) {
      tags.push('Bestseller');
    }

    // Check for "seen in" tag
    const seenInTag = this.product.meta_data?.find(meta =>
      meta.key === '_seen_in' && meta.value);

    if (seenInTag && seenInTag.value) {
      tags.push(`Seen in ${seenInTag.value}`);
    }

    // Check for exclusive tag
    const isExclusive = this.product.meta_data?.some(meta =>
      meta.key === '_exclusive' && meta.value === 'yes');

    if (isExclusive) {
      tags.push('Exclusive');
    }

    // Return a limited number of tags (at most 2)
    return tags.slice(0, 2);
  }

  private getSalePercentage(): number {
    if (!this.product.regular_price || !this.product.sale_price) {
      return 0;
    }

    const regularPrice = parseFloat(this.product.regular_price);
    const salePrice = parseFloat(this.product.sale_price);

    if (isNaN(regularPrice) || isNaN(salePrice) || regularPrice === 0) {
      return 0;
    }

    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }

  // Get appropriate CSS class for each tag
  getTagClass(tag: string): string {
    const tagLower = tag.toLowerCase();

    if (tagLower.includes('new')) {
      return 'tag-new';
    } else if (tagLower.includes('%')) {
      return 'tag-sale';
    } else if (tagLower === 'featured') {
      return 'tag-featured';
    } else if (tagLower === 'limited') {
      return 'tag-limited';
    } else if (tagLower === 'sold out') {
      return 'tag-sold-out';
    } else if (tagLower === 'bestseller') {
      return 'tag-bestseller';
    } else if (tagLower.includes('seen in')) {
      return 'tag-seen-in';
    } else if (tagLower === 'exclusive') {
      return 'tag-exclusive';
    }

    return 'tag-default';
  }
}
