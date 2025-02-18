import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { SlickCarouselModule } from 'ngx-slick-carousel';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, SlickCarouselModule],
  standalone: true,
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css'
})
export class ProductCardComponent {
  @Input() product: any;

  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: true,
    infinite: false, // لمنع التكرار اللانهائي
    autoplay: false, // تشغيل تلقائي لو عايز
    arrows: true, // إظهار الأسهم للتنقل
  };
  
}
