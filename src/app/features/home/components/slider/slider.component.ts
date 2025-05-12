import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';
import { Subscription } from 'rxjs';
import { HomeService } from '../../service/home.service';

interface BannerImage {
  large: string;
  small: string;
}

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, RouterModule, CarouselModule],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent implements OnInit, OnDestroy, AfterViewInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  
  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;
  
  bannerImages: BannerImage[] = [];
  loading: boolean = true;
  error: string | null = null;
  isMobile: boolean = false;
  
  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: true,
    navSpeed: 700,
    navText: ['', ''],
    autoplay: true,
    autoplayTimeout: 5000,
    autoplayHoverPause: true,
    responsive: {
      0: {
        items: 1,
        nav: false
      },
      768: {
        items: 1,
        nav: false // We'll use custom navigation
      }
    },
    nav: false // Disable default navigation
  };

  private subscriptions: Subscription = new Subscription();

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadBannerImages();
  }
  
  ngAfterViewInit(): void {
    this.setupCustomNavigation();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
    this.cdr.markForCheck();
  }
  
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  loadBannerImages(): void {
    this.loading = true;
    const subscription = this.homeService.getBannerImages()
      .subscribe({
        next: (bannerImages) => {
          this.bannerImages = bannerImages;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error loading banner images:', err);
          this.error = 'Failed to load banner images';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    
    this.subscriptions.add(subscription);
  }
  
  setupCustomNavigation(): void {
    setTimeout(() => {
      const prevBtn = document.querySelector('.slider-container .prev-btn') as HTMLElement;
      const nextBtn = document.querySelector('.slider-container .next-btn') as HTMLElement;
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (this.owlCarousel) {
            this.owlCarousel.prev();
          }
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (this.owlCarousel) {
            this.owlCarousel.next();
          }
        });
      }
    }, 500); // Short delay to ensure DOM is ready
  }
}
