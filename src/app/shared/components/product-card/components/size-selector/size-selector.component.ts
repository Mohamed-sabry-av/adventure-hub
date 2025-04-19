import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-size-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './size-selector.component.html',
  styleUrls: ['./size-selector.component.css'],
  animations: [
    trigger('slideUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-30%)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-30%)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-out', style({ opacity: 1 })),
      ])
    ])
  ]
})
export class SizeSelectorComponent implements OnChanges {
  @Input() isHovered: boolean = false;
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() selectedSize: string | null = null;
  @Input() sizesPerPage: number = 5; // عدد المقاسات لكل صفحة
  @Output() selectSize = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<void>();
  @Input() isMobile: boolean = false;

  sizeScrollIndex: number = 0;
  maxSizeScrollIndex: number = 0;
  visibleSizes: { size: string; inStock: boolean }[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['uniqueSizes']) {
      this.updateVisibleSizes();
    }
  }

  updateVisibleSizes(): void {
    this.maxSizeScrollIndex = Math.max(0, Math.ceil(this.uniqueSizes.length / this.sizesPerPage) - 1);
    const start = this.sizeScrollIndex * this.sizesPerPage;
    this.visibleSizes = this.uniqueSizes.slice(start, start + this.sizesPerPage);
  }

  onScrollSizes(direction: number): void {
    this.sizeScrollIndex = Math.max(0, Math.min(this.sizeScrollIndex + direction, this.maxSizeScrollIndex));
    this.updateVisibleSizes();
  }

  onSelectSize(size: string): void {
    this.selectSize.emit(size);
  }

  onAddToCart(): void {
    this.addToCart.emit();
  }

  isAddToCartDisabled(): boolean {
    return !this.selectedSize || this.uniqueSizes.length === 0;
  }
}