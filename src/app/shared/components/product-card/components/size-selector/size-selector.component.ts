import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-size-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './size-selector.component.html',
  styleUrls: ['./size-selector.component.css']
})
export class SizeSelectorComponent {
  @Input() isHovered: boolean = false;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() visibleSizes: { size: string; inStock: boolean }[] = [];
  @Input() selectedSize: string | null = null;
  @Input() sizeScrollIndex: number = 0;
  @Input() maxScrollIndex: number = 0;
  @Output() scrollSizes = new EventEmitter<number>();
  @Output() selectSize = new EventEmitter<string>();

  onScrollSizes(direction: number): void {
    this.scrollSizes.emit(direction);
  }

  onSelectSize(size: string): void {
    this.selectSize.emit(size);
  }
}