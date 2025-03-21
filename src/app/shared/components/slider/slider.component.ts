import { CommonModule } from '@angular/common';
import { Component, HostListener, Input } from '@angular/core';
@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.css',
})
export class SliderComponent {
  @Input() desktopImages: string[] = [];
  @Input() mobileImages: string[] = [];
  currentImages: string[] = [];
  isMobile = false;

  // تكوينات Slick Carousel
  slideConfig = {
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    dots: true,
    arrows: false,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          dots: true,
        },
      },
    ],
  };

  ngOnInit() {
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth <= 768;
    this.currentImages = this.isMobile ? this.mobileImages : this.desktopImages;
  }

  desktop = ['slider/1.png', 'slider/2.png', 'slider/2.png'];
  phone = [
    'slider/1responsive.png',
    'slider/2responsive.png',
    'slider/3responsive.png',
  ];
}
