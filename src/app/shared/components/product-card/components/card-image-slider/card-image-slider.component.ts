import { Component, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../../interfaces/product';
import { trigger, transition, style, animate } from '@angular/animations';

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
      ])
    ])
  ]
})
export class CardImageSliderComponent {
  @Input() product!: Product;
  @Input() currentSlide: number = 0;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() getDotCount!: () => number[];
  @Output() goToSlide = new EventEmitter<number>();
  @ViewChild('sliderContainer') sliderContainer!: ElementRef;

  onGoToSlide(index: number): void {
    this.goToSlide.emit(index);
  }

  calculateDiscount(): number {
    if (this.product?.on_sale && this.product?.regular_price && this.product?.sale_price) {
      const regularPrice = parseFloat(this.product.regular_price.toString());
      const salePrice = parseFloat(this.product.sale_price.toString());

      if (regularPrice > 0 && salePrice > 0) {
        const discount = Math.round(((regularPrice - salePrice) / regularPrice) * 100);
        return discount;
      }
    }
    return 0;
  }
}
