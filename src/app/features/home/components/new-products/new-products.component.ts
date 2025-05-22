import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-new-products',
  standalone: true,
  imports: [CommonModule, RouterModule, CarouselModule, ProductCardComponent],
  templateUrl: './new-products.component.html',
  styleUrls: ['./new-products.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;
  @ViewChild('prevBtn') prevBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('nextBtn') nextBtn?: ElementRef<HTMLButtonElement>;

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  screenWidth: number = window.innerWidth;
  
  private prevClickListener?: (e: Event) => void;
  private nextClickListener?: (e: Event) => void;

  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false, // Disable dots for better performance
    navSpeed: 300, // Faster animation
    autoplay: false,
    smartSpeed: 300, // Faster transitions
    fluidSpeed: true,
    navText: ['', ''],
    autoWidth: false,
    items: 4,
    lazyLoad: false, // Disable lazy loading for better performance
    responsive: {
      0: {
        items: 2
      },
      576: {
        items: 2
      },
      768: {
        items: 3
      },
      992: {
        items: 4
      }
    },
    nav: false
  };

  ngOnInit(): void {
    this.loadNewProducts();
    this.screenWidth = window.innerWidth;
  }

  ngAfterViewInit(): void {
    // Immediate setup plus fallback
    this.setupCustomNavigation();
    // Set a fallback in case the first attempt fails
    requestAnimationFrame(() => {
      this.setupCustomNavigation();
    });
  }
  
  ngOnDestroy(): void {
    this.removeNavigationListeners();
  }
  
  private removeNavigationListeners(): void {
    if (this.prevBtn?.nativeElement && this.prevClickListener) {
      this.prevBtn.nativeElement.removeEventListener('click', this.prevClickListener);
    }
    
    if (this.nextBtn?.nativeElement && this.nextClickListener) {
      this.nextBtn.nativeElement.removeEventListener('click', this.nextClickListener);
    }
  }

  setupCustomNavigation(): void {
    // Direct DOM manipulation for maximum performance
    try {
      this.removeNavigationListeners();
      
      // Get buttons using direct DOM queries for speed
      const prevBtn = this.prevBtn?.nativeElement || document.querySelector('.new-products .prev-btn') as HTMLElement;
      const nextBtn = this.nextBtn?.nativeElement || document.querySelector('.new-products .next-btn') as HTMLElement;
      
      if (!prevBtn || !nextBtn || !this.owlCarousel) return;
      
      // Simple and direct click handlers
      this.prevClickListener = (e: Event) => {
        e.preventDefault();
        if (this.owlCarousel) this.owlCarousel.prev();
      };
      
      this.nextClickListener = (e: Event) => {
        e.preventDefault(); 
        if (this.owlCarousel) this.owlCarousel.next();
      };
      
      // Add listeners
      prevBtn.addEventListener('click', this.prevClickListener);
      nextBtn.addEventListener('click', this.nextClickListener);
      
    } catch (err) {
      console.error('Error setting up carousel navigation:', err);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
    if (this.owlCarousel) {
      setTimeout(() => {
        this.cdr.detectChanges();
        this.setupCustomNavigation();
      }, 100);
    }
  }

  loadNewProducts(): void {
    this.loading = true;
    this.homeService.getNewArrivalsProducts(1, 12).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = 'Failed to load new products';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}