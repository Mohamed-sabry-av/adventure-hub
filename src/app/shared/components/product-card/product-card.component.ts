import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlickCarouselModule } from 'ngx-slick-carousel';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, SlickCarouselModule ,RouterLink],
  standalone: true,
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  @Input() product: any;

  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: true,
    infinite: false,
    autoplay: false, 
    arrows: true, 
    adaptiveHeight: false ,
 
  };
  
}
