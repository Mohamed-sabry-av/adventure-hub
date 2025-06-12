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
  HostListener,
  NgZone,
  PLATFORM_ID,
  Renderer2
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, take, fromEvent, BehaviorSubject, of } from 'rxjs';
import { HomeService } from '../../service/home.service';
import Splide from '@splidejs/splide';

interface BannerImage {
  large: string;
  small: string;
}

const BANNER_CACHE_KEY = 'cached_banner_images';
const BANNER_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent implements OnInit, OnDestroy, AfterViewInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private renderer = inject(Renderer2);
  
  @ViewChild('splideEl') splideEl?: ElementRef<HTMLElement>;
  
  bannerImages: BannerImage[] = [];
  loading: boolean = true;
  error: string | null = null;
  isMobile: boolean = false;
  
  private splide?: Splide;
  private subscriptions: Subscription = new Subscription();
  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkScreenSize();
      
      // Try to load cached images immediately
      this.loadCachedBanners();
      
      // Subscribe to window resize events
      const resizeSub = fromEvent(window, 'resize').subscribe(() => {
        this.checkScreenSize();
        this.updateSliderSize();
      });
      this.subscriptions.add(resizeSub);
    }
    
    // Load fresh data from API
    this.loadBannerImages();
  }
  
  ngAfterViewInit(): void {
    if (this.bannerImages.length > 0) {
      this.initSplide();
    }
    
    // Set up ResizeObserver for container element
    if (isPlatformBrowser(this.platformId) && this.splideEl) {
      this.setupResizeObserver();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    if (this.splide && isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        if (this.splide) {
          this.splide.destroy();
        }
      });
    }
  }
  
  /**
   * Load cached banner images from localStorage
   */
  private loadCachedBanners(): void {
    try {
      const cachedData = localStorage.getItem(BANNER_CACHE_KEY);
      if (cachedData) {
        const { banners, timestamp } = JSON.parse(cachedData);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < BANNER_CACHE_TTL && banners && banners.length > 0) {
          this.bannerImages = banners;
          this.loading = false;
          this.cdr.markForCheck();
          
          // Initialize Splide after cached images are loaded
          setTimeout(() => {
            this.initSplide();
          }, 0);
        }
      }
    } catch (error) {
      
    }
  }
  
  /**
   * Cache banner images to localStorage
   */
  private cacheBanners(banners: BannerImage[]): void {
    if (isPlatformBrowser(this.platformId) && banners && banners.length > 0) {
      try {
        const cacheData = {
          banners,
          timestamp: Date.now()
        };
        localStorage.setItem(BANNER_CACHE_KEY, JSON.stringify(cacheData));
      } catch (error) {
        
      }
    }
  }
  
  /**
   * Set up a ResizeObserver to watch for container size changes
   */
  private setupResizeObserver(): void {
    if (isPlatformBrowser(this.platformId) && 'ResizeObserver' in window && this.splideEl) {
      this.resizeObserver = new ResizeObserver(entries => {
        this.updateSliderSize();
      });
      this.resizeObserver.observe(this.splideEl.nativeElement);
    }
  }
  
  /**
   * Update the slider size based on the container width
   */
  private updateSliderSize(): void {
    if (this.splideEl && this.splide) {
      // Let CSS handle the aspect ratio
      this.ngZone.runOutsideAngular(() => {
        if (this.splide) {
          this.splide.refresh();
        }
      });
    }
  }
  
  @HostListener('window:resize')
  onResize(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const wasMobile = this.isMobile;
    this.checkScreenSize();
    
    // Only re-render if the device type changed (mobile/desktop)
    if (wasMobile !== this.isMobile) {
      this.cdr.markForCheck();
      this.updateSliderSize();
    }
  }
  
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  loadBannerImages(): void {
    // Skip loading from API if we already have cached banners
    if (this.bannerImages.length > 0) {
      this.loading = false;
      return;
    }
    
    this.loading = true;
    
    const subscription = this.homeService.getBannerImages()
      .pipe(take(1))
      .subscribe({
        next: (bannerImages) => {
          if (bannerImages && bannerImages.length > 0) {
            // Cache the new banners
            this.cacheBanners(bannerImages);
            
            this.bannerImages = bannerImages;
          }
          
          this.loading = false;
          this.cdr.markForCheck();
          
          // Initialize Splide after images are loaded
          if (this.splideEl && isPlatformBrowser(this.platformId)) {
            setTimeout(() => {
              this.initSplide();
              this.updateSliderSize();
            }, 0);
          }
        },
        error: (err) => {
          
          this.error = 'Failed to load banner images';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    
    this.subscriptions.add(subscription);
  }
  
  private initSplide(): void {
    if (!isPlatformBrowser(this.platformId) || !this.splideEl || this.bannerImages.length === 0) {
      return;
    }
    
    this.ngZone.runOutsideAngular(() => {
      if (this.splide) {
        this.splide.destroy();
      }
      
      // Ensure splideEl is not null (already checked above)
      const splideElement = this.splideEl!.nativeElement;
      
      this.splide = new Splide(splideElement, {
        type: 'loop',
        perPage: 1,
        autoplay: true,
        interval: 5000,
        pauseOnHover: true,
        arrows: true,
        pagination: true,
        speed: 800,
        rewind: true,
        lazyLoad: 'sequential',
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        role: 'region',
        label: 'Featured Banner Images',
        preloadPages: 1,
        waitForTransition: true,
        updateOnMove: true,
        drag: true,
        flickMaxPages: 1,
        flickPower: 500,
        throttle: 100,
      });
      
      this.splide.on('mounted', () => {
        this.updateSliderSize();
      });
      
      this.splide.on('resize', () => {
        this.updateSliderSize();
      });
      
      this.splide.mount();
    });
  }
}
