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
  signal,
  HostListener,
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
  isFullscreen = signal(false);
  fullscreenZoomLevel = signal(1);
  fullscreenPosition = signal({ x: 50, y: 50 });

  // Track image loading state
  isImageLoading: boolean = true;
  isGalleryLoading = signal(false);
  
  // Track current product ID to detect changes
  private currentProductId: number | null = null;

  // Reference to the main image container for zoom functionality
  @ViewChild('zoomContainer') zoomContainer!: ElementRef;
  @ViewChild('fullscreenContainer') fullscreenContainer!: ElementRef;

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
        // Set loading state when variation changes
        this.isGalleryLoading.set(true);
        this.selectedImageIndex = 0; // Reset to first image
        this.isImageLoading = true; // Trigger loading state
        this.cdr.detectChanges(); // Force UI update
        
        // Turn off loading after a small delay to ensure new images are loaded
        setTimeout(() => {
          this.isGalleryLoading.set(false);
          this.cdr.detectChanges();
        }, 500);
      }
    });
    
    // Effect to detect product changes
    effect(() => {
      const images = this.productImages();
      if (images && Array.isArray(images) && images.length > 0) {
        const productId = this.getProductIdFromImages(images);
        
        // If product ID changed, reset gallery
        if (productId !== this.currentProductId) {
          this.currentProductId = productId;
          this.selectedImageIndex = 0;
          this.isImageLoading = true;
          // Reset internal state but don't modify the input signal
          this.cdr.detectChanges();
        }
      }
    });
  }
  
  // Helper to extract product ID from images
  private getProductIdFromImages(images: any[]): number | null {
    if (images && images.length > 0 && images[0].id) {
      return images[0].id;
    }
    return null;
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

  // Open fullscreen image view
  openFullscreen(index?: number): void {
    if (index !== undefined) {
      this.selectedImageIndex = index;
    }
    document.body.classList.add('overflow-hidden');
    this.isFullscreen.set(true);
    this.fullscreenZoomLevel.set(1);
    this.fullscreenPosition.set({ x: 50, y: 50 });
    this.cdr.detectChanges();
  }

  // Close fullscreen image view
  closeFullscreen(): void {
    document.body.classList.remove('overflow-hidden');
    this.isFullscreen.set(false);
    this.cdr.detectChanges();
  }

  // Zoom functionality for fullscreen view
  zoomFullscreen(event: MouseEvent | TouchEvent): void {
    if (this.fullscreenZoomLevel() === 1) return;

    let clientX, clientY;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // Touch event
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    if (this.fullscreenContainer) {
      const container = this.fullscreenContainer.nativeElement;
      const rect = container.getBoundingClientRect();
      
      // Calculate position as percentage of container size
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      
      this.fullscreenPosition.set({ x, y });
    }
  }

  // Toggle zoom level in fullscreen view
  toggleFullscreenZoom(): void {
    this.fullscreenZoomLevel.set(this.fullscreenZoomLevel() === 1 ? 2.5 : 1);
    if (this.fullscreenZoomLevel() === 1) {
      this.fullscreenPosition.set({ x: 50, y: 50 });
    }
  }

  // Reset fullscreen zoom
  resetFullscreenZoom(): void {
    if (this.fullscreenZoomLevel() > 1) {
      this.fullscreenZoomLevel.set(1);
      this.fullscreenPosition.set({ x: 50, y: 50 });
    }
  }

  // Handle keyboard navigation in fullscreen mode
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isFullscreen()) return;

    switch (event.key) {
      case 'Escape':
        this.closeFullscreen();
        break;
      case 'ArrowLeft':
        this.prevImage();
        break;
      case 'ArrowRight':
        this.nextImage();
        break;
      case ' ':
        this.toggleFullscreenZoom();
        event.preventDefault();
        break;
    }
  }

  // Function to get images for the gallery based on selected color
  getGalleryImages(): { src: string; alt: string }[] {
    let imagesArray: { src: string; alt: string }[] = [];

    if (this.selectedVariation()) {
      const variation = this.selectedVariation();
      console.log('Selected variation in images component:', variation);
      
      // Add the main variation image if available
      const mainImage = variation.image?.src
        ? [{ src: variation.image.src, alt: 'Product Image' }]
        : [];
      
      // Add additional images if available
      let additionalImages: { src: string; alt: string }[] = [];
      
      if (variation.additional_images && Array.isArray(variation.additional_images)) {
        additionalImages = variation.additional_images.map((url: string) => ({
          src: url,
          alt: 'Product Image',
        }));
      }
      
      // Combine main image with additional images
      imagesArray = [...mainImage, ...additionalImages];
      console.log('Variation Images Array:', imagesArray);
    } else {
      // If no variation selected, use product's default images
      const images = this.productImages() || this.defaultImages;
      imagesArray = Array.isArray(images)
        ? images.map((img: any) => ({
            src: img.src || img,
            alt: img.alt || 'Product Image',
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
    this.resetFullscreenZoom();
    this.cdr.detectChanges();
  }

  // Navigate to the previous image
  prevImage(): void {
    const images = this.getGalleryImages();
    this.selectedImageIndex =
      (this.selectedImageIndex - 1 + images.length) % images.length;
    this.isImageLoading = true;
    this.resetFullscreenZoom();
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