import { AsyncPipe } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarouselModule } from 'primeng/carousel';
import { Observable } from 'rxjs';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home-slider',
  standalone: true,
  imports: [CarouselModule, AsyncPipe, RouterLink, ProductCardComponent],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'], 
})
export class HomeSliderComponent implements OnInit, OnDestroy {
  @Input({ required: true }) products$!: Observable<any>;

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  private mediaQueries: { [key: string]: MediaQueryList } = {};
  private mediaQueryListeners: {
    [key: string]: (event: MediaQueryListEvent) => void;
  } = {};

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {} 

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.mediaQueries['mobile'] = window.matchMedia('(max-width: 768px)');
      this.mediaQueries['tablet'] = window.matchMedia(
        '(min-width: 769px) and (max-width: 1024px)'
      );
      this.mediaQueries['desktop'] = window.matchMedia(
        '(min-width: 1025px) and (max-width: 1420px)'
      );

      this.isMobile = this.mediaQueries['mobile'].matches;
      this.isTablet = this.mediaQueries['tablet'].matches;
      this.isDesktop = this.mediaQueries['desktop'].matches;

      this.mediaQueryListeners['mobile'] = (event: MediaQueryListEvent) => {
        this.isMobile = event.matches;
      };
      this.mediaQueryListeners['tablet'] = (event: MediaQueryListEvent) => {
        this.isTablet = event.matches;
      };
      this.mediaQueryListeners['desktop'] = (event: MediaQueryListEvent) => {
        this.isDesktop = event.matches;
      };

      for (const key in this.mediaQueries) {
        this.mediaQueries[key].addEventListener(
          'change',
          this.mediaQueryListeners[key]
        );
      }
    } else {
      // قيم افتراضية على السيرفر
      this.isMobile = false;
      this.isTablet = false;
      this.isDesktop = false;
    }
  }

  ngOnDestroy() {
    // نفذ إزالة الـ listeners بس لو كنت في المتصفح
    if (isPlatformBrowser(this.platformId)) {
      for (const key in this.mediaQueries) {
        if (this.mediaQueries[key] && this.mediaQueryListeners[key]) {
          this.mediaQueries[key].removeEventListener(
            'change',
            this.mediaQueryListeners[key]
          );
        }
      }
    }
  }
}