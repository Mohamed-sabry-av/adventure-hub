import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { SlickCarouselComponent, SlickCarouselModule } from 'ngx-slick-carousel';

@Component({
  selector: 'app-product-image-slider',
  imports: [CommonModule, SlickCarouselModule],
  templateUrl: './product-image-slider.component.html',
  styleUrls: ['./product-image-slider.component.css']
})
export class ProductImageSliderComponent {
  @Input() images: { src: string; alt?: string }[] = [];
  @Input() productName: string | any = '';
  @Output() imageSelected = new EventEmitter<string>();

  @ViewChild('slickCarousel') slickCarousel!: SlickCarouselComponent;
  @ViewChild('zoomContainer', { static: false }) zoomContainer!: ElementRef;
  
  // بنستخدم selectedImage لتحديد الصورة المختارة من الـ thumbnails
  selectedImage: string = this.images.length ? this.images[0].src : '';

  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: true,
    arrows: true,
    infinite: true,
    speed: 300,
    fade: true,
    cssEase: 'ease',
    adaptiveHeight: true
  };

  

  selectImage(imageSrc: string) {
    this.selectedImage = imageSrc;
    const index = this.images.findIndex(img => img.src === imageSrc);
    if (this.slickCarousel && index !== -1) {
      this.slickCarousel.slickGoTo(index); // الانتقال للصورة المختارة
    }
  }

  afterChange(event: any) {
    this.selectedImage = this.images[event.currentSlide]?.src;
  }

  trackByFn(index: number, item: any) {
    return item.src;
  }

  zoom(event: MouseEvent) {
    const container = this.zoomContainer.nativeElement;
    const zoomedImage: HTMLElement = container.querySelector('.slick-current .main-img');
    if (!container || !zoomedImage) return;
  
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
  
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
  
    zoomedImage.style.transformOrigin = `${percentX}% ${percentY}%`;
    zoomedImage.style.transform = `scale(2)`;
  }
  
  resetZoom() {
    const container = this.zoomContainer.nativeElement;
    const zoomedImage: HTMLElement = container.querySelector('.slick-current .main-img');
    if (zoomedImage) {
      zoomedImage.style.transform = "scale(1)";
      zoomedImage.style.transformOrigin = "center center";
    }
  }
}
