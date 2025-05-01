import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-color-swatches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-swatches.component.html',

  styleUrls: ['./color-swatches.component.css'],
})
export class ColorSwatchesComponent {
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] =
    [];
  @Input() visibleColors: { color: string; image: string; inStock: boolean }[] =
    [];
  @Input() selectedColor: string | null = null;
  @Input() colorScrollIndex: number = 0;
  @Input() maxColorScrollIndex: number = 0;

  @Output() selectColor = new EventEmitter<{ color: string; image: string }>();
  @Output() scrollColors = new EventEmitter<number>();

  onSelectColor(color: string, image: string): void {
    this.selectColor.emit({ color, image });
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
}
