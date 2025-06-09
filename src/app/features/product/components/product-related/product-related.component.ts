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
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { RelatedProductsService } from '../../../../core/services/related-products.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { finalize } from 'rxjs';
import Splide from '@splidejs/splide';

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './product-related.component.html',
  styleUrls: ['./product-related.component.css'],
})
export class ProductRelatedComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  private productService = inject(ProductService);
  private relatedProductsService = inject(RelatedProductsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('splideEl') splideEl?: ElementRef<HTMLElement>;

  @Input() relatedIds: number[] = [];
  @Input() productId: number | any = null;

  relatedProducts: any[] = [];
  isLoading: boolean = true;
  maxProductsToShow: number = 25;
  initialBatchSize: number = 4; // Initial number of products to show
  
  private splide?: Splide;
  private isLoadingMore: boolean = false;

  ngOnInit() {
    this.loadRelatedProducts();
  }
  
  ngAfterViewInit() {
    this.initSplide();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['productId'] && !changes['productId'].firstChange) ||
      (changes['relatedIds'] && !changes['relatedIds'].firstChange)
    ) {
      this.loadRelatedProducts();
    }
  }
  
  private initSplide(): void {
    if (this.splideEl && this.relatedProducts.length > 0) {
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
        label: 'Related Products',
        // gap: '1rem',
        padding: { left: 0, right: 0 },
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
    
    // Get only the initial batch of IDs
    const initialIds = shuffledDirectIds.slice(0, this.initialBatchSize);
    const remainingIds = shuffledDirectIds.slice(this.initialBatchSize);

    this.productService
      .getProductsByIds(initialIds)
      .pipe(finalize(() => {
        this.isLoading = false;
        setTimeout(() => {
          if (this.relatedProducts.length > 0) {
            this.initSplide();
          }
        }, 100);
      }))
      .subscribe({
        next: (directProducts) => {
          const inStockProducts = directProducts.filter(product => 
            product.stock_status === 'instock'
          );
          
          this.relatedProducts = [...inStockProducts];
          this.cdr.markForCheck();
          
          // Defer loading of remaining direct related products
          if (remainingIds.length > 0) {
            setTimeout(() => {
              this.loadRemainingDirectProducts(remainingIds);
            }, 2000); // Wait 2 seconds before loading more
          } else {
            // If no more direct products, load additional from localStorage
            const numAdditionalNeeded = this.maxProductsToShow - this.relatedProducts.length;
            if (numAdditionalNeeded > 0) {
              setTimeout(() => {
                this.loadAdditionalProductsFromLocalStorage(numAdditionalNeeded, shuffledDirectIds);
              }, 2000); // Wait 2 seconds before loading more
            }
          }
        },
        error: (error) => {
          this.loadFromLocalStorage();
          this.cdr.markForCheck();
        },
      });
  }
  
  private loadRemainingDirectProducts(remainingIds: number[]) {
    if (this.isLoadingMore || remainingIds.length === 0) {
      return;
    }
    
    this.isLoadingMore = true;

    this.productService.getProductsByIds(remainingIds).subscribe({
      next: (moreProducts) => {
        const inStockProducts = moreProducts.filter(product => 
          product.stock_status === 'instock'
        );
        
        // Filter out duplicates
        const existingIds = new Set(this.relatedProducts.map(p => p.id));
        const uniqueNewProducts = inStockProducts.filter(p => !existingIds.has(p.id));
        
        if (uniqueNewProducts.length > 0) {
          this.relatedProducts = [...this.relatedProducts, ...uniqueNewProducts];
          this.cdr.markForCheck();
          
          // Update the carousel
          if (this.splide) {
            this.splide.refresh();
          }
        }
        
        // If we still need more products, load from localStorage
        const numAdditionalNeeded = this.maxProductsToShow - this.relatedProducts.length;
        if (numAdditionalNeeded > 0) {
          this.loadAdditionalProductsFromLocalStorage(numAdditionalNeeded, [...remainingIds, ...this.relatedProducts.map(p => p.id)]);
        }
        
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading remaining direct products:', error);
        
        // If direct products fail, try loading from localStorage
        const numAdditionalNeeded = this.maxProductsToShow - this.relatedProducts.length;
        if (numAdditionalNeeded > 0) {
          this.loadAdditionalProductsFromLocalStorage(numAdditionalNeeded, this.relatedProducts.map(p => p.id));
        }
        
        this.isLoadingMore = false;
      }
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
        const inStockAdditionalProducts = additionalProducts.filter(product => 
          product.stock_status === 'instock'
        );
        
        const existingIds = new Set(this.relatedProducts.map((p) => p.id));
        const uniqueAdditionalProducts = inStockAdditionalProducts.filter((p) => !existingIds.has(p.id));

        this.relatedProducts = [
          ...this.relatedProducts,
          ...uniqueAdditionalProducts.slice(0, count)
        ];

        this.cdr.markForCheck();
        
        setTimeout(() => {
          this.initSplide();
        }, 100);
      },
      error: (error) => {
        console.error('Error loading additional products:', error);
        this.cdr.markForCheck();
      }
    });
  }

  private loadFromLocalStorage() {
    const excludeIds = this.productId ? [this.productId] : [];
    const allRelatedIds = this.relatedProductsService.getRandomRelatedIds(this.maxProductsToShow, excludeIds);

    if (allRelatedIds.length === 0) {
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }
    
    // Get only initial batch
    const initialIds = allRelatedIds.slice(0, this.initialBatchSize);
    const remainingIds = allRelatedIds.slice(this.initialBatchSize);

    this.productService
      .getProductsByIds(initialIds)
      .pipe(finalize(() => {
        this.isLoading = false;
        setTimeout(() => {
          if (this.relatedProducts.length > 0) {
            this.initSplide();
          }
        }, 100);
      }))
      .subscribe({
        next: (products) => {
          const inStockProducts = products.filter(product => 
            product.stock_status === 'instock'
          );
          
          this.relatedProducts = inStockProducts;
          this.cdr.markForCheck();
          
          // Defer loading of remaining products
          if (remainingIds.length > 0) {
            setTimeout(() => {
              this.loadRemainingLocalStorageProducts(remainingIds);
            }, 2000); // Wait 2 seconds before loading more
          }
        },
        error: (error) => {
          console.error('Error loading related products:', error);
          this.relatedProducts = [];
          this.cdr.markForCheck();
        },
      });
  }
  
  private loadRemainingLocalStorageProducts(remainingIds: number[]) {
    if (this.isLoadingMore || remainingIds.length === 0) {
      return;
    }
    
    this.isLoadingMore = true;

    this.productService.getProductsByIds(remainingIds).subscribe({
      next: (moreProducts) => {
        const inStockProducts = moreProducts.filter(product => 
          product.stock_status === 'instock'
        );
        
        // Filter out duplicates
        const existingIds = new Set(this.relatedProducts.map(p => p.id));
        const uniqueNewProducts = inStockProducts.filter(p => !existingIds.has(p.id));
        
        if (uniqueNewProducts.length > 0) {
          this.relatedProducts = [...this.relatedProducts, ...uniqueNewProducts];
          this.cdr.markForCheck();
          
          // Update the carousel
          if (this.splide) {
            this.splide.refresh();
          }
        }
        
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading remaining localStorage products:', error);
        this.isLoadingMore = false;
      }
    });
  }

  onProductClick(productSlug: string): void {
    if (productSlug) {
      this.router.navigate(['/product', productSlug]);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  
  ngOnDestroy(): void {
    if (this.splide) {
      this.splide.destroy();
    }
  }
}
