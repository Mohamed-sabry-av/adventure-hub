import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  HostListener,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, Variation } from '../../../../../interfaces/product';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductTagsService } from '../../../../../shared/services/product-tags.service';

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
  @Input() product!: Product  ;
  @Input() isHovered: boolean = false;
  @Input() variations: Variation[] = []; // Ensure variations is defined
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  isMobile: boolean = false;
  currentImageIndex: number = 0;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private productTagsService: ProductTagsService
  ) {}

  ngOnInit() {
    this.checkIfMobile();
    if (this.isMobile) {
      this.isHovered = false; // تعطيل الهوفر على الموبايل
    }
  }
  get hasMultipleImages(): boolean {
    return !!this.product?.images && this.product.images.length > 1;
  }
  get maxImageIndex(): number {
    return (this.product?.images?.length ?? 0) - 1;
  }
  

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkIfMobile();
    }
    if (this.isMobile) {
      this.isHovered = false; // منع الهوفر عند اللمس
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

  /**
   * Navigate between product images
   * @param direction 1 for next, -1 for previous
   * @param event Click event to prevent default behavior
   */
  navigateImages(direction: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.product?.images || this.product.images.length <= 1) {
      return;
    }

    const newIndex = this.currentImageIndex + direction;
    if (newIndex >= 0 && newIndex < this.product.images.length) {
      this.currentImageIndex = newIndex;
      this.cdr.markForCheck();
    }
  }

  /**
   * Go to a specific image by index
   * @param index The index of the image to show
   * @param event Click event to prevent default behavior
   */
  goToImage(index: number, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!this.product?.images || index < 0 || index >= this.product.images.length) {
      return;
    }

    this.currentImageIndex = index;
    this.cdr.markForCheck();
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
    return srcsetEntries.length > 0
      ? srcsetEntries.join(',')
      : `${image.src} ${maxWidth}w`;
  }

  /**
   * Get all product tags to display
   */
  getProductTags(): string[] {
    return this.productTagsService.getProductTags(this.product, this.variations);
  }

  /**
   * Gets optimized image URL using the service
   */
  getOptimizedImageUrl(originalUrl: string): string {
    return this.productTagsService.getOptimizedImageUrl(originalUrl);
  }

  /**
   * Gets the CSS class for a specific tag using the service
   */
  getTagClass(tag: string): string {
    return this.productTagsService.getTagClass(tag);
  }
}
