import { Component, Input, ViewChild, ElementRef, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
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
  @Input() isHovered: boolean = false;
  @Input() variations: Variation[] = []; // Ensure variations is defined
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  isMobile: boolean = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    this.checkIfMobile();
  }

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
      this.isMobile = false;
    }
  }

  onImageLoad(event: Event) {
    const imgElement = event.target as HTMLImageElement;
  }

  getImageSrcset(image: any): string {
    if (!image.srcset) {
      return `${image.src} 1000w`;
    }
    const maxWidth = 780;
    const srcsetEntries = image.srcset.split(',').filter((entry: any) => {
      const width = parseInt(entry.match(/(\d+)w/)?.[1] || '0');
      return width <= maxWidth;
    });
    return srcsetEntries.length > 0 ? srcsetEntries.join(',') : `${image.src} ${maxWidth}w`;
  }

  getProductTags(): string[] {
    if (!this.product) {
      console.warn('No product provided to getProductTags');
      return [];
    }

    const tags: string[] = [];

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

    if (this.product.on_sale) {
      const salePercentage = this.getSalePercentage();
      if (salePercentage > 0) {
        tags.push(`-${salePercentage}%`);
      }
    }

    if (this.product.tags && this.product.tags.length > 0) {
      const hubTag = this.product.tags.find(
        (tag) => tag.name?.toUpperCase() === 'HUB' || tag.slug?.toLowerCase() === 'hub'
      );
      if (hubTag) {
        tags.push('HUB');
      }
    }

    if (this.product.type === 'variable' && this.variations.length > 0) {
      const anyVariationInStock = this.variations.some(
        (v) => v.stock_status === 'instock'
      );
      if (!anyVariationInStock) {
        tags.push('SOLD OUT');
      }
    } else if (this.product.type === 'simple' && this.product.stock_status !== 'instock') {
      tags.push('SOLD OUT');
    }

    const isBestSeller =
      (this.product.rating_count && this.product.rating_count > 20) ||
      (this.product.meta_data &&
        this.product.meta_data.some(
          (meta) => meta.key === '_best_seller' && meta.value === 'yes'
        ));
    if (isBestSeller) {
      tags.push('BESTSELLER');
    }

    if (this.product.featured) {
      tags.push('FEATURED');
    }

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

  getOptimizedImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';

    if (originalUrl.includes('?')) {
      return originalUrl;
    }

    const screenWidth = isPlatformBrowser(this.platformId) ? window.innerWidth : 1024;
    let imageWidth = 400;

    if (screenWidth < 768) {
      imageWidth = 300;
    } else if (screenWidth < 1024) {
      imageWidth = 350;
    }

    return `${originalUrl}?width=${imageWidth}&quality=80`;
  }

  getSalePercentage(): number {
    if (!this.product || !this.product.regular_price || !this.product.sale_price) {
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