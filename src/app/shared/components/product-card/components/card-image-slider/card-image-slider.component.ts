import { Component, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../../interfaces/product';

@Component({
  selector: 'app-card-image-slider',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './card-image-slider.component.html',
  styleUrls: ['./card-image-slider.component.css']
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
}