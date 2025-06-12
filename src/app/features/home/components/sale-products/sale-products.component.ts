import {
  Component,
  OnInit,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  AfterViewInit,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import Splide from '@splidejs/splide';

@Component({
  selector: 'app-sale-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './sale-products.component.html',
  styleUrls: ['./sale-products.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('splideEl') splideEl?: ElementRef<HTMLElement>;

  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  private splide?: Splide;

  ngOnInit(): void {
    this.loadSaleProducts();
  }

  ngAfterViewInit(): void {
    this.initSplide();
  }

  ngOnDestroy(): void {
    if (this.splide) {
      this.splide.destroy();
    }
  }

  private initSplide(): void {
    if (this.splideEl && this.products.length > 0) {
      if (this.splide) {
        this.splide.destroy();
      }
      
      this.splide = new Splide(this.splideEl.nativeElement, {
        type: 'loop',
        perPage: 4,
        perMove: 1,
        pagination: true,
        arrows: true,
        // height: '560px',
        autoplay: false,
        speed: 800,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        lazyLoad: 'nearby',
        drag: true,
        snap: true,
        role: 'region',
        label: 'Sale Products',
        // gap: '1rem',
        padding: { left: '1rem', right: '1rem' },
        // focus: 'center',
        trimSpace: true,
        updateOnMove: true,
        arrowPath: 'm15.5 0.932-4.3 4.38 14.5 14.6-14.5 14.5 4.3 4.4 14.6-14.6 4.4-4.3-4.4-4.4-14.6-14.6z',
        breakpoints: {
          640: {
            perPage: 2,
            padding: { left: 0, right: 0 },
            // gap: '0.5rem',
            arrows: false,
            width: '100%'
          },
          1024: {
            perPage: 3,
            padding: { left: 0, right: 0 }
          },
          1180: {
            perPage: 4,
            padding: { left: 0, right: 0 }
          }
        }
      });
      
      this.splide.mount();
    }
  }

  loadSaleProducts(): void {
    this.loading = true;
    this.homeService.getSaleProducts(1, 12).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
        this.cdr.markForCheck();
        
        // Initialize Splide after data is loaded
        setTimeout(() => {
          this.initSplide();
        }, 100);
      },
      error: (err: any) => {
        this.error = 'Failed to load sale products';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}