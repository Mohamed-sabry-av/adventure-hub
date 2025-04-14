import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { SizeSelectorComponent } from '../size-selector/size-selector.component';

@Component({
  selector: 'app-mobile-quick-add',
  standalone: true,
  imports: [CommonModule, SizeSelectorComponent],
  templateUrl: './quick-add-btn.component.html',
  styleUrls: ['./quick-add-btn.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ]),
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ],
})
export class MobileQuickAddComponent {
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() selectedSize: string | null = null;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() selectedColor: string | null = null;
  @Input() mobileQuickAddExpanded: boolean = false;
  @Input() isMobile: boolean = false;
  @Input() isHovered: boolean = false;
  @Input() visibleColors: { color: string; image: string; inStock: boolean }[] = [];

  @Output() toggleMobileQuickAdd = new EventEmitter<void>();
  @Output() selectSize = new EventEmitter<string>();
  @Output() selectColor = new EventEmitter<{ color: string; image: string }>();
  @Output() addToCart = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  onToggleMobileQuickAdd(): void {
    this.toggleMobileQuickAdd.emit();
    this.cdr.markForCheck();
  }

  onSelectSize(size: string): void {
    this.selectSize.emit(size);
    // If on desktop and we have both colors and sizes, add to cart immediately when both are selected
    if (!this.isMobile && this.hasColors() && this.hasSizes() && this.selectedColor && size) {
      this.onAddToCart();
    }
    this.cdr.markForCheck();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['uniqueSizes']) {
      // console.log('uniqueSizes changed in MobileQuickAdd:', this.uniqueSizes);
      this.cdr.detectChanges(); // أضف ده عشان يحدث الـ UI
    }
  }
  onSelectColor(color: string, image: string): void {
    this.selectColor.emit({ color, image });
    this.cdr.markForCheck();
  }

  onAddToCart(): void {
    if (this.isAddToCartDisabled()) return;
    this.addToCart.emit();
    if (this.isMobile) this.onToggleMobileQuickAdd();
    this.cdr.markForCheck();
  }

  isAddToCartDisabled(): boolean {
    const needsSize = this.hasSizes() && !this.selectedSize;
    const needsColor = this.hasColors() && !this.selectedColor;
    return needsSize || needsColor;
  }

  hasSizes(): boolean {
    return this.uniqueSizes.length > 0;
  }

  hasColors(): boolean {
    return this.colorOptions.length > 0;
  }

  hasVariations(): boolean {
    return this.hasSizes() || this.hasColors();
  }

  // Desktop: Show Add to Cart when there are no colors or no sizes together
  // Mobile: Show Add to Cart when there are no variations
  shouldShowAddToCartButton(): boolean {
    if (this.isMobile) {
      // On mobile, show direct add to cart if there are no sizes (colors only or no variations)
      return !this.hasSizes();
    } else {
      // On desktop, show direct add to cart if there are not both colors and sizes
      return !(this.hasColors() && this.hasSizes());
    }
  }

  // Show mobile Quick Add button only when there are both colors and sizes
  shouldShowQuickAddButton(): boolean {
    return this.isMobile && this.hasColors() && this.hasSizes();
  }

  // Show the desktop hover size selector (for products with sizes only, no colors)
  shouldShowDesktopSizeSelector(): boolean {
    return !this.isMobile && this.hasSizes() && this.isHovered && !this.hasColors();
  }
}
