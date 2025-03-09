import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, ElementRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css'],
})
export class ProductCardComponent implements OnInit {
  @Input() product: any;
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  variations: any[] = [];
  colorOptions: { color: string; image: string }[] = [];
  uniqueSizes: { size: string; inStock: boolean }[] = [];
  selectedColor: string | null = null;
  currentSlide: number = 0;
  isHovered: boolean = false;
  selectedSize: string | null = null;
  isQuickAddClicked = false;
  sizeScrollIndex: number = 0;
  visibleSizes: { size: string; inStock: boolean }[] = [];
  maxScrollIndex: number = 0;

  constructor(private productService: ProductService) { }

  ngOnInit(): void {
    this.productService
      .getProductVariations(this.product.id)
      .subscribe((variations) => {
        this.variations = variations || [];
        this.colorOptions = this.getColorOptions();
        if (this.colorOptions.length > 0) {
          this.selectColor(
            this.colorOptions[0].color,
            this.colorOptions[0].image
          );
        } else {
          this.uniqueSizes = this.getSizesForColor('');
        }
        this.updateVisibleSizes();
      });
  }

  getColorOptions(): { color: string; image: string, inStock: boolean }[] {
    const colorMap = new Map<string, { image: string; inStock: boolean }>();
    this.variations.forEach((v) => {
      const colorAttr = v.attributes.find((attr: any) => attr.name === 'Color');
      if (colorAttr && v.image?.src) {
        if (!colorMap.has(colorAttr.option)) {
          colorMap.set(colorAttr.option, {
            image: v.image.src,
            inStock: v.stock_status === 'instock'
          });
        }
      }
    });
    const options = Array.from(colorMap, ([color, data]) => ({
      color,
      image: data.image,
      inStock: data.inStock
    }));
    return options.length > 1 ? options : [];
  }

  getSizesForColor(color: string): { size: string; inStock: boolean }[] {
    let sizes: { size: string; inStock: boolean }[] = [];

    if (!color && this.colorOptions.length === 0) {
      sizes = this.variations.map((v) => {
        const sizeAttr = v.attributes.find((attr: any) => attr.name === 'Size');
        return {
          size: sizeAttr?.option || '',
          inStock: v.stock_status === 'instock',
        };
      }).filter((item) => item.size); // نfilter عشان نتشرد إن الـ size موجود
    } else {
      sizes = this.variations
        .filter((v) =>
          v.attributes.some(
            (attr: any) => attr.name === 'Color' && attr.option === color
          )
        )
        .map((v) => {
          const sizeAttr = v.attributes.find((attr: any) => attr.name === 'Size');
          return {
            size: sizeAttr?.option || '',
            inStock: v.stock_status === 'instock',
          };
        })
        .filter((item) => item.size);
    }

    // نرجع الـ sizes من غير تكرار باستخدام Map
    return Array.from(
      new Map(sizes.map((item) => [item.size, item])).values()
    );
  }

  selectColor(color: string, image: string): void {
    this.selectedColor = color;
    const selectedColorImages = this.variations
      .filter((v) =>
        v.attributes.some(
          (attr: any) => attr.name === 'Color' && attr.option === color
        )
      )
      .map((v) => ({ src: v.image?.src || image }));

    if (selectedColorImages.length > 0) {
      this.product.images = selectedColorImages;
      this.currentSlide = 0;
    }
    this.uniqueSizes = this.getSizesForColor(color);
    this.selectedSize = null;
    this.updateVisibleSizes();
  }

  onHover(hovered: boolean): void {
    this.isHovered = hovered;
    if (this.colorOptions.length === 0 && this.product.images?.length > 1) {
      this.currentSlide = hovered ? 1 : 0;
    }
  }

  selectSize(size: string): void {
    this.selectedSize = size;
  }

  prevSlide(): void {
    if (this.product.images && this.product.images.length > 1) {
      this.currentSlide =
        (this.currentSlide - 1 + this.product.images.length) %
        this.product.images.length;
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
    return this.product?.images?.length
      ? Array.from({ length: this.product.images.length }, (_, i) => i)
      : [];
  }

  onQuickAddClick() {
    this.isQuickAddClicked = !this.isQuickAddClicked;
  }

  scrollSizes(direction: number): void {
    this.sizeScrollIndex = Math.max(
      0,
      Math.min(this.sizeScrollIndex + direction, this.maxScrollIndex)
    );
    this.updateVisibleSizes();
  }

  updateVisibleSizes(): void {
    const sizesPerPage = 5;
    this.maxScrollIndex = Math.ceil(this.uniqueSizes.length / sizesPerPage) - 1;
    const start = this.sizeScrollIndex * sizesPerPage;
    this.visibleSizes = this.uniqueSizes.slice(start, start + sizesPerPage);
  }
}
