import { Component, input, OnInit } from '@angular/core';
import { GalleriaModule } from 'primeng/galleria';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-product-images',
  imports: [GalleriaModule, ButtonModule],
  templateUrl: './product-images.component.html',
  styleUrls: ['./product-images.component.css'],
})
export class ProductImagesComponent implements OnInit {
  // Inputs من الـ parent component
  productImages = input<any>();         // الصور الأساسية للمنتج
  selectedColor = input<string | null>(null);  // اللون المختار
  variations = input<any[]>([]);        // الـ variations بتاعة المنتج

  isMobile: boolean = false;
  mediaQuery!: MediaQueryList;
  mediaQueryListener!: (event: MediaQueryListEvent) => void;

  position: 'left' | 'right' | 'top' | 'bottom' = 'left';
  showIndicatorsOnItem: boolean = true;

  // الصور الافتراضية لو مفيش بيانات
  defaultImages: string[] = [
    'slider/1.webp',
    'slider/2.webp',
    'slider/3.webp',
    'slider/4.webp',
    'slider/5.webp',
  ];

  ngOnInit() {
    this.mediaQuery = window.matchMedia('(max-width: 1172px)');
    this.isMobile = this.mediaQuery.matches;
    this.mediaQueryListener = (event: MediaQueryListEvent) => {
      this.isMobile = event.matches;
    };
    this.mediaQuery.addEventListener('change', this.mediaQueryListener);
  }

  // دالة لتحديد الصور اللي هتتعرض في الـ gallery
  getGalleryImages(): { src: string }[] {
    // لو مفيش لون مختار أو مفيش variations، نرجع الصور الأساسية
    if (!this.selectedColor() || !this.variations() || !this.variations().length) {
      const images = this.productImages() || this.defaultImages;
      return Array.isArray(images) ? images.map((img: any) => ({ src: img.src || img })) : [];
    }

    // ندور على الـ variation اللي بتطابق اللون المختار
    const selectedVariation = this.variations().find((v: any) =>
      v.attributes?.some(
        (attr: any) => attr.name === 'Color' && attr.option === this.selectedColor()
      )
    );

    // لو لقينا variation وفيه صورة، نرجعها
    if (selectedVariation && selectedVariation.image?.src) {
      return [{ src: selectedVariation.image.src }];
    }

    // لو مفيش variation مطابقة، نرجع الصور الأساسية
    const images = this.productImages() || this.defaultImages;
    return Array.isArray(images) ? images.map((img: any) => ({ src: img.src || img })) : [];
  }
}