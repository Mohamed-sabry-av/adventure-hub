import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgxImageZoomModule } from 'ngx-image-zoom';

@Component({
  selector: 'app-product-image-slider',
  imports: [CommonModule, NgxImageZoomModule],
  templateUrl: './product-image-slider.component.html',
  styleUrls: ['./product-image-slider.component.css']
})
export class ProductImageSliderComponent {
  @Input() images: { src: string; alt?: string }[] = [];
  @Input() productName: string | any = '';
  @Output() imageSelected = new EventEmitter<string>();

  selectedImage: string | null = null;

  selectImage(imageSrc: string) {
    this.selectedImage = imageSrc;
    this.imageSelected.emit(this.selectedImage);
  }

  trackByFn(index: number, item: any) {
    return item.src;
  }
}