import { AsyncPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarouselModule } from 'primeng/carousel';
import { Observable } from 'rxjs';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-home-slider',
  imports: [CarouselModule, AsyncPipe, RouterLink, ProductCardComponent],
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.css',
})
export class HomeSliderComponent {
  @Input({ required: true }) products$!: Observable<any>;

  isMobile: boolean = false;
  isTablet: boolean = false;
  isDesktop: boolean = false;

  private mediaQueries: { [key: string]: MediaQueryList } = {};
  private mediaQueryListeners: {
    [key: string]: (event: MediaQueryListEvent) => void;
  } = {};

  ngOnInit() {
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
  }

  ngOnDestroy() {
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
