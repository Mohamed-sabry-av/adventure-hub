import { Component, Input, ViewChild, ElementRef, Output, EventEmitter, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, Variation } from '../../../../../interfaces/product';
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
      ]),
    ]),
  ],
})
export class CardImageSliderComponent implements OnInit {
  @Input() product!: Product;
  @Input() currentSlide: number = 0;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() variations: Variation[] = [];
  @Output() goToSlide = new EventEmitter<number>();
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  touchStartX: number = 0;
  touchEndX: number = 0;
  isMobile: boolean = false;
  isSwiping: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {} // أضفنا platformId

  ngOnInit() {
    this.checkIfMobile();
  }

  // تعديل HostListener عشان يشتغل بس في المتصفح
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkIfMobile();
    }
  }

  checkIfMobile() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth <= 768;
    } else {
      this.isMobile = false; // قيمة افتراضية على السيرفر
    }
  }

  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.touches[0].clientX;
    this.isSwiping = true;
  }

  onTouchMove(e: TouchEvent) {
    if (!this.isSwiping) return;
    this.touchEndX = e.touches[0].clientX;
  }

  onTouchEnd(e: TouchEvent) {
    if (!this.isSwiping) return;
    this.isSwiping = false;
    const swipeThreshold = 50;
    const swipeDistance = this.touchEndX - this.touchStartX;
    if (Math.abs(swipeDistance) < swipeThreshold) return;
    if (this.product.images && this.product.images.length > 1) {
      if (swipeDistance > 0) {
        this.navigateSlide(-1);
      } else {
        this.navigateSlide(1);
      }
    }
  }

  navigateSlide(direction: number) {
    if (!this.product.images) return;
    const totalSlides = this.product.images.length;
    let newSlide = this.currentSlide + direction;
    if (newSlide < 0) newSlide = totalSlides - 1;
    if (newSlide >= totalSlides) newSlide = 0;
    this.onGoToSlide(newSlide);
  }

  onGoToSlide(index: number): void {
    this.goToSlide.emit(index);
    this.currentSlide = index;
  }

  getDotCount(): number[] {
    if (!this.product || !this.product.images) return [];
    return Array(this.product.images.length)
      .fill(0)
      .map((_, i) => i);
  }

  getProductTags(): string[] {
    if (!this.product) {
      console.warn('No product provided to getProductTags');
      return [];
    }

    const tags: string[] = [];

    // Check if product is new (within 14 days)
    if (this.product.date_created) {
      const createdDate = new Date(this.product.date_created);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff <= 14) {
        tags.push('NEW!');
      }
    }

    // Check if product is on sale
    if (this.product.on_sale) {
      const salePercentage = this.getSalePercentage();
      if (salePercentage > 0) {
        tags.push(`-${salePercentage}%`);
      }
    }

    // Check for HUB tag
    if (this.product.tags && this.product.tags.length > 0) {
      const hubTag = this.product.tags.find(
        (tag) =>
          tag.name?.toUpperCase() === 'HUB' || tag.slug?.toLowerCase() === 'hub'
      );
      if (hubTag) {
        tags.push('HUB');
      }
    }

    // Check stock status
    if (this.product.type === 'variable') {
      // For variable products, check variations stock status
      if (this.variations.length > 0) {
        const anyVariationInStock = this.variations.some(
          (v) => v.stock_status === 'instock'
        );
        if (!anyVariationInStock) {
          tags.push('SOLD OUT');
        }
      } else {
        // If no variations provided, assume out of stock
        tags.push('SOLD OUT');
      }
    } 

    // Check for best seller
    const isBestSeller =
      (this.product.rating_count && this.product.rating_count > 20) ||
      (this.product.meta_data &&
        this.product.meta_data.some(
          (meta) => meta.key === '_best_seller' && meta.value === 'yes'
        ));
    if (isBestSeller) {
      tags.push('BESTSELLER');
    }

    // Check if product is featured
    if (this.product.featured) {
      tags.push('FEATURED');
    }

    // Apply priority order (max 2 tags for bottom, HUB separate)
    const bottomTags = tags.filter((tag) => tag !== 'HUB');
    const priorityOrder = [
      bottomTags.find((tag) => tag === 'SOLD OUT'),
      bottomTags.find((tag) => tag === 'NEW!'),
      bottomTags.find((tag) => tag.includes('%')),
      bottomTags.find((tag) => tag === 'FEATURED'),
      bottomTags.find((tag) => tag === 'BESTSELLER'),
    ].filter(Boolean) as string[];

    const finalBottomTags = priorityOrder.slice(0, 2);
    return [...finalBottomTags, ...(tags.includes('HUB') ? ['HUB'] : [])];
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
}