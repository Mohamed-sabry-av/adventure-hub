import { Component, input } from '@angular/core';
import { GalleriaModule } from 'primeng/galleria';
import { Carousel } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
@Component({
  selector: 'app-product-images',
  imports: [GalleriaModule, ButtonModule, Carousel],
  templateUrl: './product-images.component.html',
  styleUrl: './product-images.component.css',
})
export class ProductImagesComponent {
  productImages = input<any>();

  isMobile: boolean = false;
  mediaQuery!: MediaQueryList;
  mediaQueryListener!: (event: MediaQueryListEvent) => void;

  position: 'left' | 'right' | 'top' | 'bottom' = 'left';
  showIndicatorsOnItem: boolean = true;

  // هنا هنحط الاراي بتاعت الصور
  images: string[] = [
    'slider/1.webp',
    'slider/2.webp',
    'slider/3.webp',
    'slider/4.webp',
    'slider/5.webp',
  ];

  ngOnInit() {
    this.mediaQuery = window.matchMedia('(max-width: 1024px)');
    this.isMobile = this.mediaQuery.matches;
    this.mediaQueryListener = (event: MediaQueryListEvent) => {
      this.isMobile = event.matches;
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  selectedImagePath = this.images[0];

  onSelectedImage(imagePath: string) {
    this.selectedImagePath = imagePath;
  }
}
