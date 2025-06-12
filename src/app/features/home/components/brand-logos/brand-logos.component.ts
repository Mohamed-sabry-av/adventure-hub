import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { Subscription, finalize } from 'rxjs';
import Splide from '@splidejs/splide';
// Splide CSS is already imported globally in angular.json

interface Brand {
  id: number;
  name: string;
  slug: string;
  count: number;
  image?: {
    src?: string;
    url?: string;
  };
}

@Component({
  selector: 'app-brand-logos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './brand-logos.component.html',
  styleUrls: ['./brand-logos.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandLogosComponent implements OnInit, OnDestroy, AfterViewInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  
  @ViewChild('splideRef') splideRef!: ElementRef;
  private splide?: Splide;
  
  brands: Brand[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Featured brand IDs - can be configured or fetched from a settings API
  private featuredBrandIds: number[] = [550, 5126, 1126, 2461, 1441, 989, 877, 971, 3537, 4582, 311, 5276, 396, 415, 3102, 2743, 3546];
  
  // Subscriptions for cleanup
  private subscriptions = new Subscription();
  
  ngOnInit(): void {
    this.loadBrands();
  }
  
  ngAfterViewInit(): void {
    if (this.brands.length > 0) {
      this.initSplide();
    }
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.splide) {
      this.splide.destroy();
    }
  }
  
  private initSplide(): void {
    if (!isPlatformBrowser(this.platformId) || !this.splideRef?.nativeElement) {
      return;
    }
    
    this.ngZone.runOutsideAngular(() => {
      this.splide = new Splide(this.splideRef.nativeElement, {
        type: 'loop',
        perPage: 8,
        perMove: 1,
        gap: '0.5rem',
        pagination: false,
        arrows: false,
        autoplay: true,
        interval: 2000,
        drag: true,
        speed: 600,
        pauseOnHover: true,
        fixedWidth: '110px',
        focus: 0,
        trimSpace: true,
        padding: { left: '0.5rem', right: '0.5rem' },
        cloneStatus: true,
        updateOnMove: true,
        rewind: true,
        rewindByDrag: true,
        isNavigation: false,
        mediaQuery: 'min',
        lazyLoad: 'nearby',
        autoStart: true,
        resetProgress: false,
        wheel: false,
        releaseWheel: true,
        waitForTransition: true,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        breakpoints: {
          400: { 
            perPage: 3, 
            fixedWidth: '86px',
            padding: { left: '0.5rem', right: '0.5rem' },
            autoplay: true,
            interval: 2000
          },
          576: { 
            perPage: 4, 
            fixedWidth: '90px',
            padding: { left: '0.5rem', right: '0.5rem' },
            autoplay: true,
            interval: 2000
          },
          768: { 
            perPage: 5, 
            fixedWidth: '100px',
            padding: { left: '0.5rem', right: '0.5rem' },
            autoplay: true,
            interval: 2000
          },
          992: { 
            perPage: 6, 
            fixedWidth: '110px',
            padding: { left: '0.5rem', right: '0.5rem' },
            autoplay: true,
            interval: 2000
          },
          1200: { 
            perPage: 7, 
            fixedWidth: '110px',
            padding: { left: '0.5rem', right: '0.5rem' },
            autoplay: true,
            interval: 2000
          },
          1400: {
            perPage: 8, 
            fixedWidth: '110px',
            padding: { left: '0.5rem', right: '0.5rem' },
            autoplay: true,
            interval: 2000
          }
        }
      });

      // Make sure the carousel is properly positioned and auto-plays
      this.splide.mount();
      
      // Force autoplay to start
      setTimeout(() => {
        if (this.splide && this.splide.Components.Autoplay) {
          this.splide.Components.Autoplay.play();
        }
      }, 300);
    });
  }
  
  private loadBrands(): void {
    this.loading = true;
    
    const brandsSub = this.homeService.getFeaturedBrands(this.featuredBrandIds)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (brands: Brand[]) => {
          // Filter out brands without images to ensure consistent display
          this.brands = brands
            .filter(brand => brand.image && (brand.image.url || brand.image.src))
            .slice(0, 12); // Limit to 12 brands for better performance
          
          this.cdr.detectChanges();
          
          // Initialize Splide now that brands are loaded
          setTimeout(() => {
            this.initSplide();
          }, 0);
        },
        error: (err) => {
          this.error = 'Failed to load brands';
          
          this.cdr.markForCheck();
        }
      });
      
    this.subscriptions.add(brandsSub);
  }
}
