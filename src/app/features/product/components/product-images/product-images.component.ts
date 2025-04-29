import { Component, input, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-images',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-images.component.html',
  styleUrls: ['./product-images.component.css'],
})
export class ProductImagesComponent implements OnInit, OnDestroy {
  // Inputs from parent component
  productImages = input<any>();
  selectedColor = input<string | null>(null);
  variations = input<any[]>([]);
  productName = input<string>('Product');

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

  ngOnInit() {
    this.mediaQuery = window.matchMedia('(max-width: 1172px)');
    this.isMobile = this.mediaQuery.matches;
    this.mediaQueryListener = (event: MediaQueryListEvent) => {
      this.isMobile = event.matches;
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  // Clean up event listeners when component is destroyed
  ngOnDestroy() {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
    }
  }

  // Function to get images for the gallery based on selected color
  getGalleryImages(): { src: string; alt: string }[] {
    if (!this.selectedColor() || !this.variations()?.length) {
      const images = this.productImages() || this.defaultImages;
      return Array.isArray(images)
        ? images.map((img: any) => ({
            src: img.src || img,
            alt: img.alt || 'صورة المنتج'
          }))
        : [];
    }

    // ابحث عن variation باللون المختار
    const selectedVariation = this.variations().find((v: any) => {
      const match = v.attributes?.some(
        (attr: any) =>
          attr.name === 'Color' &&
          attr.option.toLowerCase() === this.selectedColor()?.toLowerCase()
      );
      return match;
    });

    // لو لقيت variation، ارجع صورها
    if (selectedVariation) {
      const mainImage = selectedVariation.image?.src
        ? [{ src: selectedVariation.image.src, alt: 'صورة المنتج' }]
        : [];
      const additionalImages = selectedVariation.additional_images?.map((url: string) => ({
        src: url,
        alt: 'صورة المنتج'
      })) || [];
      return [...mainImage, ...additionalImages];
    }

    const images = this.productImages() || this.defaultImages;
    return Array.isArray(images)
      ? images.map((img: any) => ({
          src: img.src || img,
          alt: img.alt || 'صورة المنتج'
        }))
      : [];
  }

  // Select a specific image by index
  selectImage(index: number): void {
    if (this.selectedImageIndex !== index) {
      this.isImageLoading = true;
      this.selectedImageIndex = index;
    }
  }

  // Navigate to the next image
  nextImage(): void {
    const images = this.getGalleryImages();
    this.selectedImageIndex = (this.selectedImageIndex + 1) % images.length;
    this.isImageLoading = true;
  }

  // Navigate to the previous image
  prevImage(): void {
    const images = this.getGalleryImages();
    this.selectedImageIndex = (this.selectedImageIndex - 1 + images.length) % images.length;
    this.isImageLoading = true;
  }

  // Handle image load event to update loading state
  onImageLoad(): void {
    this.isImageLoading = false;
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
