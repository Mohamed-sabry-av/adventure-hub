import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-color-swatches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-swatches.component.html',
  styleUrls: ['./color-swatches.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ColorSwatchesComponent implements OnChanges {
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() visibleColors: { color: string; image: string; inStock: boolean }[] = [];
  @Input() selectedColor: string | null = null;
  @Input() colorScrollIndex: number = 0;
  @Input() maxColorScrollIndex: number = 0;
  @Input() showColorPlaceholder: boolean = true; // Whether to show placeholder when no colors
  @Output() selectColor = new EventEmitter<{ color: string; image: string }>();
  @Output() scrollColors = new EventEmitter<number>();
  // Whether to show the container at all (true if colorOptions exist or placeholder enabled)
  get showContainer(): boolean {
    return this.colorOptions.length > 0 || this.showColorPlaceholder;
  }
  ngOnChanges(changes: SimpleChanges): void {
    // If colorOptions change and are empty, we may need to update visibility
    if (changes['colorOptions']) {
      // Implementation remains the same
    }
  }
  onSelectColor(color: string, image: string, inStock: boolean): void {
    if (inStock) {
      this.selectColor.emit({ color, image });
    }
  }
  onScrollColors(direction: number): void {
    this.scrollColors.emit(direction);
  }
  getShortColorName(colorName: string): string {
    // If the color name is too long, truncate it
    return colorName.length > 10
      ? colorName.substring(0, 7) + '...'
      : colorName;
  }
  // Format the color name to be more readable
  formatColorName(colorName: string): string {
    if (!colorName) return '';
    // Convert slug format to readable format
    return colorName
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

