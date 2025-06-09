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
  OnChanges,
  SimpleChanges,
  OnDestroy
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product, Variation } from '../../../../../interfaces/product';
import { trigger, transition, style, animate } from '@angular/animations';
import { ProductTagsService } from '../../../../../shared/services/product-tags.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardImageSliderComponent implements OnInit, OnChanges, OnDestroy {
  @Input() product!: Product;
  @Input() isHovered: boolean = false;
  @Input() variations: Variation[] = []; // Ensure variations is defined
  @Input() selectedColorImage: string = ''; // Added input for selected color image
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  isMobile: boolean = false;
  currentImageIndex: number = 0;
  selectedColorIndex: number = -1; // Track index of the selected color image
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private productTagsService: ProductTagsService
  ) {}

  ngOnInit() {
    this.checkIfMobile();
  }

  ngOnChanges(changes: SimpleChanges) {
    // When selectedColorImage changes, find the corresponding image index
    if (changes['selectedColorImage'] && this.selectedColorImage && this.product?.images) {
      // Find the index of the selected color image
      this.selectedColorIndex = this.product.images.findIndex(
        (img) => img.src === this.selectedColorImage || 
                 img.src.includes(this.selectedColorImage) || 
                 this.selectedColorImage.includes(img.src)
      );
      
      // If found, update current image index but don't interfere with hover behavior
      if (this.selectedColorIndex >= 0 && (!this.isHovered || !this.hasMultipleImages)) {
        this.currentImageIndex = this.selectedColorIndex;
        this.cdr.markForCheck();
      }
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.checkIfMobile();
    this.cdr.markForCheck();
  }

  get hasMultipleImages(): boolean {
    return !!this.product?.images && this.product.images.length > 1;
  }
  get maxImageIndex(): number {
    return (this.product?.images?.length ?? 0) - 1;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
