import {
  Component,
  input,
  OnInit,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  effect,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-images',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-images.component.html',
  styleUrls: ['./product-images.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // OnPush عشان الأداء
})
export class ProductImagesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef); // ChangeDetectorRef عشان التحديث اليدوي
  productImages = input<any>();
  selectedColor = input<string | null>(null);
  variations = input<any[]>([]);
  productName = input<string>('Product');
  selectedVariation = input<any | null>(null);

  // State variables
  isMobile: boolean = false;
  mediaQuery!: MediaQueryList;
  mediaQueryListener!: (event: MediaQueryListEvent) => void;
  selectedImageIndex: number = 0;

  isZoomed: boolean = false;

  // Track image loading state
  isImageLoading: boolean = true;

  // Reference to the main image container for zoom functionality
  @ViewChild('zoomContainer') zoomContainer!: ElementRef;

  // Default images if no data is provided
  defaultImages: string[] = [
    'https://ext.same-assets.com/1752825376/481985518.jpeg',
    'https://ext.same-assets.com/1752825376/2732260570.jpeg',
    'https://ext.same-assets.com/1752825376/2764654690.jpeg',
    'https://ext.same-assets.com/1752825376/2084582008.jpeg',
    'https://ext.same-assets.com/1752825376/3391035264.jpeg',
  ];

  constructor() {
    // Effect to reset selectedImageIndex when selectedVariation changes
    effect(() => {
      const variation = this.selectedVariation();
      if (variation) {
        this.selectedImageIndex = 0; // Reset to first image
        this.isImageLoading = true; // Trigger loading state
        this.cdr.detectChanges(); // Force UI update
      }
    });
  }

  ngOnInit() {
    this.mediaQuery = window.matchMedia('(max-width: 1172px)');
    this.isMobile = this.mediaQuery.matches;
    this.mediaQueryListener = (event: MediaQueryListEvent) => {
      this.isMobile = event.matches;
      this.cdr.detectChanges(); // Update UI on media query change
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);

    this.destroyRef.onDestroy(() => {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    });
  }

  // Clean up event listeners when component is destroyed
  ngOnDestroy() {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  // Function to get images for the gallery based on selected color
  getGalleryImages(): { src: string; alt: string }[] {
    let imagesArray: { src: string; alt: string }[] = [];

    if (this.selectedVariation()) {
      // لو فيه variation مختارة، استخدم صورها
      const mainImage = this.selectedVariation().image?.src
        ? [{ src: this.selectedVariation().image.src, alt: 'Product Image' }]
        : [];
      const additionalImages =
        this.selectedVariation().additional_images?.map((url: string) => ({
          src: url,
          alt: 'Product Image',
        })) || [];
      imagesArray = [...mainImage, ...additionalImages];
    } else {
      // لو مفيش variation، استخدم صور المنتج الافتراضية
      const images = this.productImages() || this.defaultImages;
      imagesArray = Array.isArray(images)
        ? images.map((img: any) => ({
            src: img.src || img,
            alt: img.alt || 'صورة المنتج',
          }))
        : [];
    }

    // Ensure selectedImageIndex is within bounds
    if (this.selectedImageIndex >= imagesArray.length && imagesArray.length > 0) {
      this.selectedImageIndex = 0;
      this.isImageLoading = true;
      this.cdr.detectChanges();
    }

    return imagesArray;
  }

  // Select a specific image by index
  selectImage(index: number): void {
    const images = this.getGalleryImages();
    if (index >= 0 && index < images.length) {
      this.isImageLoading = true;
      this.selectedImageIndex = index;
      this.cdr.detectChanges(); // Force UI update
    }
  }

  // Navigate to the next image
  nextImage(): void {
    const images = this.getGalleryImages();
    this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
    this.isImageLoading = true;
    this.cdr.detectChanges();
  }

  // Navigate to the previous image
  prevImage(): void {
    const images = this.getGalleryImages();
    this.selectedImageIndex =
      (this.selectedImageIndex - 1 + images.length) % images.length;
    this.isImageLoading = true;
    this.cdr.detectChanges();
  }

  // Handle image load event to update loading state
  onImageLoad(): void {
    this.isImageLoading = false;
    this.cdr.detectChanges();
  }

  // Improved zoom functionality with class toggle
  zoom(event: MouseEvent) {
    if (this.isMobile) return; // Don't enable zoom on mobile

    const container = this.zoomContainer.nativeElement;
    const zoomedImage: HTMLElement = container.querySelector('.main-img');
    if (!container || !zoomedImage) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    zoomedImage.style.transformOrigin = `${percentX}% ${percentY}%`;
    zoomedImage.style.transform = `scale(2)`;
    zoomedImage.classList.add('zoomed');
    this.isZoomed = true;
  }

  // Reset zoom when mouse leaves the container
  resetZoom() {
    if (this.isMobile) return;

    const container = this.zoomContainer.nativeElement;
    const zoomedImage = container.querySelector('.main-img');
    if (!zoomedImage) return;

    zoomedImage.style.transform = 'scale(1)';
    zoomedImage.classList.remove('zoomed');
    this.isZoomed = false;
  }

  // Track by function for ngFor performance
  trackByFn(index: number, item: any): string {
    return item.src || index;
  }

  // Getter for images array to use in template
  get images(): { src: string; alt: string }[] {
    return this.getGalleryImages();
  }
}