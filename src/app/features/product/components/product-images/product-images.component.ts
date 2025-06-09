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
  PLATFORM_ID,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { VariationService } from '../../../../core/services/variation.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Splide from '@splidejs/splide';

@Component({
  selector: 'app-product-images',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-images.component.html',
  styleUrls: ['./product-images.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImagesComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private variationService = inject(VariationService);
  private platformId = inject(PLATFORM_ID);
  
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

  // Splide instances
  private mainSplide?: Splide;
  private thumbsSplide?: Splide;

  // Reference to Splide elements
  @ViewChild('splideMain') splideMainRef!: ElementRef;
  @ViewChild('splideThumb') splideThumbRef!: ElementRef;

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
        
        // Keep loading state visible for a short time to show transition
        setTimeout(() => {
          this.isGalleryLoading.set(false);
          this.cdr.detectChanges();
          this.updateSplide();
        }, 300);
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
          this.cdr.detectChanges();
          this.updateSplide();
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
    if (isPlatformBrowser(this.platformId)) {
    this.mediaQuery = window.matchMedia('(max-width: 1172px)');
    this.isMobile = this.mediaQuery.matches;
    this.mediaQueryListener = (event: MediaQueryListEvent) => {
      this.isMobile = event.matches;
      this.cdr.detectChanges(); // Update UI on media query change
        this.updateSplide();
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
    } else {
      this.isMobile = false;
    }

    // Subscribe to loading state from VariationService
    this.variationService.getLoadingState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isLoading => {
        if (isLoading) {
          this.isGalleryLoading.set(true);
          this.isImageLoading = true;
          this.cdr.detectChanges();
        }
      });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initSplide();
    }
  }

  // Initialize Splide sliders
  private initSplide(): void {
    if (!isPlatformBrowser(this.platformId) || !this.splideMainRef) return;

    // Destroy existing instances if they exist
    if (this.mainSplide) {
      this.mainSplide.destroy();
    }
    if (this.thumbsSplide) {
      this.thumbsSplide.destroy();
    }

    // Initialize thumbnails slider only if there are multiple images
    if (this.images.length > 1 && this.splideThumbRef) {
      this.thumbsSplide = new Splide(this.splideThumbRef.nativeElement, {
        direction: this.isMobile ? 'ltr' : 'ttb',
        height: this.isMobile ? '80px' : '500px',
        width: this.isMobile ? '100%' : '80px',
        gap: '10px',
        rewind: true,
        pagination: false,
        arrows: false,
        cover: true,
        fixedWidth: 60,
        fixedHeight: 60,
        isNavigation: true,
        // focus: 'center',
      });
    }

    // Initialize main slider
    this.mainSplide = new Splide(this.splideMainRef.nativeElement, {
      type: 'fade',
      rewind: true,
      pagination: false,
      arrows: this.images.length > 1, // Only show arrows if there are multiple images
      height: '500px',
    });

    // Sync the two sliders if thumbnails exist
    if (this.thumbsSplide && this.images.length > 1) {
      this.mainSplide.sync(this.thumbsSplide);
      // Mount thumbnails slider
      this.thumbsSplide.mount();
    }
    
    // Add custom classes to main slider arrows
    this.mainSplide.on('mounted', () => {
      // Handle arrow classes
      const prevArrow = this.splideMainRef.nativeElement.querySelector('.splide__arrow--prev');
      const nextArrow = this.splideMainRef.nativeElement.querySelector('.splide__arrow--next');
      
      if (prevArrow) prevArrow.classList.add('prev');
      if (nextArrow) nextArrow.classList.add('next');
    });

    // Update the selectedImageIndex when slide changes
    this.mainSplide.on('moved', (newIndex) => {
      this.selectedImageIndex = newIndex;
      this.cdr.detectChanges();
    });

    // Mount main slider
    this.mainSplide.mount();
  }

  // Update Splide when images or layout changes
  private updateSplide(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initSplide();
      }, 100);
    }
  }

  // Clean up event listeners when component is destroyed
  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
      }
      
      if (this.mainSplide) {
        this.mainSplide.destroy();
      }
      
      if (this.thumbsSplide) {
        this.thumbsSplide.destroy();
      }
    }
  }

  // Open fullscreen image view
  openFullscreen(index?: number): void {
    if (index !== undefined) {
      this.selectedImageIndex = index;
      if (this.mainSplide) {
        this.mainSplide.go(index);
      }
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
      
      imagesArray = [...mainImage, ...additionalImages];
    } else if (this.productImages() && Array.isArray(this.productImages())) {
      // Use original product images if no variation is selected
      imagesArray = this.productImages().map((img: any) => ({
        src: img.src,
            alt: img.alt || 'Product Image',
      }));
    }

    return imagesArray.length > 0 ? imagesArray : this.defaultImages.map(src => ({ src, alt: 'Product Image' }));
  }

  selectImage(index: number): void {
    if (index === this.selectedImageIndex) return;
    
      this.selectedImageIndex = index;
    this.isImageLoading = true;
    
    if (this.mainSplide) {
      this.mainSplide.go(index);
    }
    
    this.cdr.detectChanges();
  }

  nextImage(): void {
    const nextIndex = (this.selectedImageIndex + 1) % this.images.length;
    this.selectImage(nextIndex);
    
    if (this.mainSplide) {
      this.mainSplide.go('>');
    }
  }

  prevImage(): void {
    const prevIndex = this.selectedImageIndex - 1 < 0 
      ? this.images.length - 1 
      : this.selectedImageIndex - 1;
    this.selectImage(prevIndex);
    
    if (this.mainSplide) {
      this.mainSplide.go('<');
  }
  }

  onImageLoad(): void {
    this.isImageLoading = false;
    this.cdr.detectChanges();
  }

  onImageError(): void {
    this.isImageLoading = false;
    this.cdr.detectChanges();
  }

  zoom(event: MouseEvent) {
    if (this.isZoomed) {
      // Calculate relative position in the container
      const rect = this.zoomContainer.nativeElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      // Update image position
      const img = this.zoomContainer.nativeElement.querySelector('.splide__slide.is-active img');
      if (img) {
        img.style.transformOrigin = `${x}% ${y}%`;
      }
    }
  }

  resetZoom() {
    this.isZoomed = false;
    const img = this.zoomContainer.nativeElement.querySelector('.splide__slide.is-active img');
    if (img) {
      img.style.transform = 'scale(1)';
    }
  }

  toggleZoom() {
    this.isZoomed = !this.isZoomed;
    const img = this.zoomContainer.nativeElement.querySelector('.splide__slide.is-active img');
    if (img) {
      img.style.transform = this.isZoomed ? 'scale(2)' : 'scale(1)';
    }
  }

  trackByFn(index: number, item: any): string {
    return item.src;
  }

  get images(): { src: string; alt: string }[] {
    return this.getGalleryImages();
  }
}