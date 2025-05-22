import {
  Component,
  inject,
  Input,
  OnInit,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { forkJoin, Observable, of, timer } from 'rxjs';
import { catchError, finalize, map, take } from 'rxjs/operators';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, CarouselModule],
  templateUrl: './product-related.component.html',
  styleUrls: ['./product-related.component.css'],
})
export class ProductRelatedComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;
  @ViewChild('prevBtn') prevBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('nextBtn') nextBtn?: ElementRef<HTMLButtonElement>;

  @Input() relatedIds: number[] = [];
  @Input() productId: number | any = null;

  relatedProducts: any[] = [];
  isLoading: boolean = true;
  maxProductsToShow: number = 25;

  private prevClickListener?: (e: Event) => void;
  private nextClickListener?: (e: Event) => void;

  // Carousel options
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
    nav: false
  };

  ngOnInit() {
    this.loadRelatedProducts();
  }

  ngAfterViewInit() {
    timer(100, 300)
      .pipe(take(5))
      .subscribe(() => {
        this.setupCustomNavigation();
      });
  }

  ngOnDestroy() {
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
    this.zone.runOutsideAngular(() => {
      // إزالة المستمعين السابقين
      this.removeNavigationListeners();

      if (this.prevBtn?.nativeElement && this.nextBtn?.nativeElement && this.owlCarousel) {
        this.prevClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.prev();
            this.zone.run(() => {
              this.cdr.markForCheck();
            });
          }
        };
        
        this.nextClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.next();
            this.zone.run(() => {
              this.cdr.markForCheck();
            });
          }
        };
        
        this.prevBtn.nativeElement.addEventListener('click', this.prevClickListener);
        this.nextBtn.nativeElement.addEventListener('click', this.nextClickListener);
      } else {
        // استخدام محددات DOM كخطة بديلة
        const prevBtn = document.querySelector('.products-carousel .prev-btn') as HTMLElement;
        const nextBtn = document.querySelector('.products-carousel .next-btn') as HTMLElement;
        
        if (prevBtn && nextBtn && this.owlCarousel) {
          this.prevClickListener = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.owlCarousel) {
              this.owlCarousel.prev();
              this.zone.run(() => {
                this.cdr.markForCheck();
              });
            }
          };
          
          this.nextClickListener = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.owlCarousel) {
              this.owlCarousel.next();
              this.zone.run(() => {
                this.cdr.markForCheck();
              });
            }
          };
          
          prevBtn.addEventListener('click', this.prevClickListener);
          nextBtn.addEventListener('click', this.nextClickListener);
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['productId'] && !changes['productId'].firstChange) ||
      (changes['relatedIds'] && !changes['relatedIds'].firstChange)
    ) {
      this.loadRelatedProducts();
    }
  }

  loadRelatedProducts() {
    this.isLoading = true;

    if (this.productId && this.relatedIds && this.relatedIds.length > 0) {
      this.relatedProductsService.addRelatedIds(this.productId, this.relatedIds);
      this.loadDirectRelatedProducts();
    } else {
      this.loadFromLocalStorage();
    }
  }

  private loadDirectRelatedProducts() {
    if (!this.relatedIds || this.relatedIds.length === 0) {
      this.loadFromLocalStorage();
      return;
    }

    const shuffledDirectIds = this.shuffleArray([...this.relatedIds]);
    const numAdditionalNeeded = this.maxProductsToShow - shuffledDirectIds.length;

    this.productService
      .getProductsByIds(shuffledDirectIds)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (directProducts) => {
          // Filter out of stock products
          const inStockProducts = directProducts.filter(product => 
            product.stock_status === 'instock'
          );
          
          this.relatedProducts = [...inStockProducts];

          if (numAdditionalNeeded > 0) {
            this.loadAdditionalProductsFromLocalStorage(numAdditionalNeeded, shuffledDirectIds);
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadFromLocalStorage();
          this.cdr.markForCheck();
        },
      });
  }

  private loadAdditionalProductsFromLocalStorage(count: number, excludeIds: number[] = []) {
    const idsToExclude = [...excludeIds];
    if (this.productId) {
      idsToExclude.push(this.productId);
    }

    const additionalIds = this.relatedProductsService.getRandomRelatedIds(count + 5, idsToExclude);

    if (additionalIds.length === 0) {
      return;
    }

    this.productService.getProductsByIds(additionalIds).subscribe({
      next: (additionalProducts) => {
        // Filter out of stock products
        const inStockAdditionalProducts = additionalProducts.filter(product => 
          product.stock_status === 'instock'
        );
        
        const existingIds = new Set(this.relatedProducts.map((p) => p.id));
        const uniqueAdditionalProducts = inStockAdditionalProducts.filter((p) => !existingIds.has(p.id));

        this.relatedProducts = [...this.relatedProducts, ...uniqueAdditionalProducts];
        this.relatedProducts = this.shuffleArray(this.relatedProducts).slice(0, this.maxProductsToShow);

        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cdr.markForCheck();
      },
    });
  }

  private loadFromLocalStorage() {
    const randomIds = this.relatedProductsService.getRandomRelatedIds(this.maxProductsToShow, this.productId);

    if (randomIds.length === 0) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.productService
      .getProductsByIds(randomIds)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (products) => {
          // Filter out of stock products
          this.relatedProducts = products.filter(product => 
            product.stock_status === 'instock'
          );
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.relatedProducts = [];
          this.cdr.markForCheck();
        },
      });
  }

  onProductClick(productSlug: string): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.router.navigate(['/product', productSlug]);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}