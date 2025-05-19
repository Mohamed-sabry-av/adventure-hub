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
    dots: true,
    navSpeed: 300,
    navText: ['', ''],
    autoWidth: false,
    items: 4,
    lazyLoad: true,
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
    setTimeout(() => {
      this.setupCustomNavigation();
    }, 100);
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
    if (this.prevBtn?.nativeElement && this.nextBtn?.nativeElement && this.owlCarousel) {
      this.prevClickListener = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.owlCarousel) {
          this.owlCarousel.prev();
          this.cdr.markForCheck();
        }
      };
      
      this.nextClickListener = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.owlCarousel) {
          this.owlCarousel.next();
          this.cdr.markForCheck();
        }
      };
      
      this.prevBtn.nativeElement.addEventListener('click', this.prevClickListener);
      this.nextBtn.nativeElement.addEventListener('click', this.nextClickListener);
    } else {
      const prevBtn = document.querySelector('.new-products .prev-btn') as HTMLElement;
      const nextBtn = document.querySelector('.new-products .next-btn') as HTMLElement;
      
      if (prevBtn && nextBtn && this.owlCarousel) {
        this.prevClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.prev();
            this.cdr.markForCheck();
          }
        };
        
        this.nextClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.next();
            this.cdr.markForCheck();
          }
        };
        
        prevBtn.addEventListener('click', this.prevClickListener);
        nextBtn.addEventListener('click', this.nextClickListener);
      }
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