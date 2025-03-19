import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-color-swatches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './color-swatches.component.html',
  styleUrls: ['./color-swatches.component.css']
})
export class ColorSwatchesComponent {
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() selectedColor: string | null = null;
  @Output() selectColor = new EventEmitter<{ color: string; image: string }>();

  onSelectColor(color: string, image: string): void {
    this.selectColor.emit({ color, image });
  }
}