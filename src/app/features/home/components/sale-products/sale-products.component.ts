import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-sale-products',
  standalone: true,
  imports: [CommonModule, RouterModule, CarouselModule, ProductCardComponent],
  templateUrl: './sale-products.component.html',
  styleUrls: ['./sale-products.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleProductsComponent implements OnInit, AfterViewInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  screenWidth: number = window.innerWidth;

  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: true,
    navSpeed: 700,
    navText: ['', ''],
    autoWidth: false,
    items: 4,
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
    nav: false // Disable default navigation
  };

  ngOnInit(): void {
    this.loadSaleProducts();
    this.screenWidth = window.innerWidth;
  }

  ngAfterViewInit(): void {
    this.setupCustomNavigation();
  }

  setupCustomNavigation(): void {
    setTimeout(() => {
      const prevBtn = document.querySelector('.sale-products .prev-btn') as HTMLElement;
      const nextBtn = document.querySelector('.sale-products .next-btn') as HTMLElement;
      
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

  @HostListener('window:resize')
  onResize() {
    this.screenWidth = window.innerWidth;
    // Force refresh carousel on resize
    if (this.owlCarousel) {
      setTimeout(() => {
        // Force rerender of carousel
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      }, 200);
    }
  }

  loadSaleProducts(): void {
    this.loading = true;
    this.homeService.getSaleProducts(1, 12).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = 'Failed to load sale products';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}