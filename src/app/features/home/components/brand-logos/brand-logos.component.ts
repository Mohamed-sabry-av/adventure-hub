import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { Subscription, finalize } from 'rxjs';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';

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
  imports: [CommonModule, RouterModule, CarouselModule],
  template: `
<div class="brand-logos py-2 px-2 bg-white">
  <div class="container mx-auto">
    @if (loading) {
      <div class="brand-skeleton-container">
        <div class="brand-carousel-skeleton flex items-center">
          @for (item of [1,2,3,4,5,6,7,8]; track item) {
            <div class="brand-skeleton animate-pulse mx-2 p-2 flex items-center justify-center">
              <div class="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
          }
        </div>
      </div>
    } @else if (brands.length > 0) {
      <div class="brands-carousel relative">
        <owl-carousel-o [options]="carouselOptions">
          @for (brand of brands; track brand.id) {
            <ng-template carouselSlide [id:string]="brand.id">
              <a
                [routerLink]="['/product/brand', brand.slug]"
                class="brand-logo flex items-center justify-center h-12 p-2 transition-all duration-300"
              >
                @if (brand.image && brand.image.url) {
                  <img
                    [src]="brand.image.url"
                    [alt]="brand.name"
                    class="max-h-full max-w-full object-contain brand-image transition-all duration-300"
                  />
                } @else {
                  <span class="font-bold text-gray-800">{{ brand.name }}</span>
                }
              </a>
            </ng-template>
          }
        </owl-carousel-o>
      </div>
    } 
  </div>
</div>
  `,
  styles: [
    `
     .brands-carousel {
  padding: 0;
}

.brand-logo {
  border-radius: 8px;
  margin: 0 10px;
  text-align: center;
}

.brand-image {
  filter: grayscale(100%);
  opacity: 0.6;
  max-height: 40px;
}

.brand-logo:hover .brand-image {
  filter: grayscale(0%);
  opacity: 1;
}

/* إخفاء أي عناصر تحكم زائدة (تحسبًا) */
.owl-nav,
.owl-dots {
  display: none !important;
}

/* ضبط عرض العناصر في الـ carousel */
.owl-carousel .owl-item .brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
}

/* Brand skeleton styles */
.brand-carousel-skeleton {
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  padding: 10px 0;
}

.brand-carousel-skeleton::-webkit-scrollbar {
  display: none;
}

.brand-skeleton {
  min-width: 120px;
  height: 48px;
  border-radius: 8px;
}
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandLogosComponent implements OnInit, OnDestroy {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  
  brands: Brand[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Featured brand IDs - can be configured or fetched from a settings API
  private featuredBrandIds: number[] = [201, 216, 239, 248, 264, 270, 285, 294, 302, 326];
  
  // Subscriptions for cleanup
  private subscriptions = new Subscription();
  
  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: true,
    navSpeed: 700,
    autoplay: true,
    autoplayTimeout: 5000,
    autoplayHoverPause: true,
    items: 6,
    responsive: {
      0: {
        items: 2
      },
      400: {
        items: 3
      },
      768: {
        items: 4
      },
      992: {
        items: 5
      },
      1200: {
        items: 6
      }
    },
    nav: false
  };
  
  ngOnInit(): void {
    this.loadBrands();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  private loadBrands(): void {
    this.loading = true;
    
    // For better performance, use the cached brand data
    const brandsSub = this.homeService.getAllBrands(100)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (brands: Brand[]) => {
          // Filter and prioritize featured brands
          const featuredBrands = brands.filter((brand: Brand) => 
            this.featuredBrandIds.includes(brand.id)
          );
          
          // Sort by the order in featuredBrandIds array
          featuredBrands.sort((a: Brand, b: Brand) => {
            return this.featuredBrandIds.indexOf(a.id) - this.featuredBrandIds.indexOf(b.id);
          });
          
          // If we don't have enough featured brands, add some random ones to make up the difference
          if (featuredBrands.length < 12) {
            const nonFeaturedBrands = brands
              .filter((brand: Brand) => !this.featuredBrandIds.includes(brand.id))
              // Only include brands with a decent number of products
              .filter((brand: Brand) => brand.count > 5)
              // Sort by product count
              .sort((a: Brand, b: Brand) => b.count - a.count)
              // Take enough to fill out our carousel
              .slice(0, 12 - featuredBrands.length);
              
            this.brands = [...featuredBrands, ...nonFeaturedBrands];
          } else {
            this.brands = featuredBrands.slice(0, 12);
          }
          
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Failed to load brands';
          console.error('Error loading brands:', err);
          this.cdr.markForCheck();
        }
      });
      
    this.subscriptions.add(brandsSub);
  }
}
