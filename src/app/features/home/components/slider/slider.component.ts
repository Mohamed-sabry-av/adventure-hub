import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';

interface Slide {
  id: number;
  imageSrc: string;
  imageAlt: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
}

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './slider.component.html',

  styleUrls: ['./slider.component.css'],
})
export class SliderComponent implements OnInit, OnDestroy {
  slides: Slide[] = [
    {
      id: 1,
      imageSrc:
        'https://images.stockcake.com/public/7/d/8/7d85a1a1-4976-468a-abe8-7ed32d870f1b_large/hiking-mountain-trail-stockcake.jpg',
      imageAlt: 'Hikers on a mountain trail with beautiful view',
      title: 'EXPLORE NEW ADVENTURES',
      subtitle: 'Best outdoor gear for your mountain journeys',
      buttonText: 'Shop Now',
      buttonLink: '/products',
      backgroundColor: '#c9ff00',
    },
    {
      id: 2,
      imageSrc:
        'https://thumbs.dreamstime.com/b/man-hiking-mountains-mountain-landscape-trail-hiker-backpack-beautiful-view-nature-scene-adventure-tourism-outdoor-345401597.jpg',
      imageAlt: 'Hiker with a beautiful mountain view',
      title: 'MOUNTAIN HIKING ESSENTIALS',
      subtitle: 'Premium gear for your mountain adventures',
      buttonText: 'Discover',
      buttonLink: '/category/hiking',
      backgroundColor: '#006350',
    },
    {
      id: 3,
      imageSrc:
        'https://media.self.com/photos/6238bbdfd226c69aaec6d069/4:3/w_2560%2Cc_limit/GettyImages-926586802.jpg',
      imageAlt: 'Camping gear and tent in nature',
      title: 'CAMPING SEASON DEALS',
      subtitle: 'Get up to 30% off on select outdoor items',
      buttonText: 'View Deals',
      buttonLink: '/sale',
      backgroundColor: '#ff6c00',
    },
  ];

  currentSlide = 0;
  autoSlideSubscription: Subscription | null = null;
  autoSlideInterval = 5000; // 5 seconds
  isMobile = false;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  constructor() {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  prevSlide(): void {
    this.stopAutoSlide();
    this.currentSlide =
      this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
    this.startAutoSlide();
  }

  nextSlide(): void {
    this.stopAutoSlide();
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.startAutoSlide();
  }

  goToSlide(index: number): void {
    this.stopAutoSlide();
    this.currentSlide = index;
    this.startAutoSlide();
  }

  startAutoSlide(): void {
    this.autoSlideSubscription = interval(this.autoSlideInterval).subscribe(
      () => {
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
      }
    );
  }

  stopAutoSlide(): void {
    if (this.autoSlideSubscription) {
      this.autoSlideSubscription.unsubscribe();
      this.autoSlideSubscription = null;
    }
  }
}
