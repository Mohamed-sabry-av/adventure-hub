import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, ElementRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent implements OnInit {
  @Input() product: any;
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  variations: any[] = [];
  colorOptions: { color: string; image: string }[] = [];
  uniqueSizes: string[] = [];
  selectedColor: string | null = null;
  currentSlide: number = 0;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.productService.getProductVariations(this.product.id).subscribe(variations => {
      this.variations = variations || [];
      this.colorOptions = this.getColorOptions();
    });
  }

  getColorOptions(): { color: string; image: string }[] {
    const colorMap = new Map<string, string>();
    this.variations.forEach(v => {
      const colorAttr = v.attributes.find((attr: any) => attr.name === 'Color');
      if (colorAttr && v.image?.src) {
        if (!colorMap.has(colorAttr.option)) {
          colorMap.set(colorAttr.option, v.image.src);
        }
      }
    });
    const options = Array.from(colorMap, ([color, image]) => ({ color, image }));
    return options.length > 1 ? options : [];
  }

  getSizesForColor(color: string): string[] {
    return [...new Set(this.variations
      .filter(v => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      .map(v => v.attributes.find((attr: any) => attr.name === 'Size')?.option)
      .filter(size => size))];
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    const selectedColorImages = this.variations
      .filter(v => v.attributes.some((attr: any) => attr.name === 'Color' && attr.option === color))
      .map(v => ({ src: v.image?.src || image }));

    if (selectedColorImages.length > 0) {
      this.product.images = selectedColorImages;
      this.currentSlide = 0; // إعادة تعيين الشريحة الحالية إلى الأولى
    }
    this.uniqueSizes = this.getSizesForColor(color);
  }

  prevSlide(): void {
    if (this.product.images && this.product.images.length > 1) {
      this.currentSlide = (this.currentSlide - 1 + this.product.images.length) % this.product.images.length;
    }
  }

  nextSlide(): void {
    if (this.product.images && this.product.images.length > 1) {
      this.currentSlide = (this.currentSlide + 1) % this.product.images.length;
    }
  }

  goToSlide(index: number): void {
    if (this.product.images && this.product.images.length > 0) {
      this.currentSlide = index;
    }
  }

  getDotCount(): number[] {
    return this.product?.images?.length ? Array.from({ length: this.product.images.length }, (_, i) => i) : [];
  }
}