import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  HostListener,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProductsBrandService } from '../../../products/services/products-brand.service';

interface Brand {
  id: number;
  name: string;
  slug: string;
  count: number;
  image?: {
    id: string;
    url: string;
    width: number;
    height: number;
  };
}

@Component({
  selector: 'app-brand-logos',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="brand-logos py-8 px-4 bg-white">
      <div class="container mx-auto">
        <div class="brands-carousel relative">
          <div class="brands-slider overflow-hidden">
            <div
              class="brands-track flex transition-transform duration-500 ease-in-out"
              [style.transform]="'translateX(' + -currentPosition + 'px)'"
              [style.width]="totalWidth + 'px'"
            >
              @for (brand of brands; track brand.id) {
              <a
                [routerLink]="['/brand', brand.slug]"
                class="brand-logo flex items-center justify-center h-16 p-2 transition-all duration-300"
                [style.min-width.px]="getItemWidth()"
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
              }
            </div>
          </div>

          <!-- Navigation arrows - only shown on desktop -->
          <button
            *ngIf="showControls"
            (click)="prev()"
            class="carousel-nav prev absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow-md focus:outline-none"
            aria-label="Previous brands"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button
            *ngIf="showControls"
            (click)="next()"
            class="carousel-nav next absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow-md focus:outline-none"
            aria-label="Next brands"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .brands-carousel {
        padding: 0 40px;
      }

      .brands-slider {
        margin: 0 auto;
        width: 100%;
      }

      .brand-logo {
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        margin: 0 10px;
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

      @media (max-width: 768px) {
        .brands-carousel {
          padding: 0;
        }

        .carousel-nav {
          display: none;
        }
      }
    `,
  ],
})
export class BrandLogosComponent implements OnInit {
  private productsBrandService = inject(ProductsBrandService);

  brands: Brand[] = [];
  currentPosition = 0;
  screenWidth = window.innerWidth;
  totalWidth = 0;
  showControls = true;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
    this.setCarouselParameters();
  }

  ngOnInit(): void {
    this.loadBrands();
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
  }

  loadBrands(): void {
    // أولاً نحاول الحصول على العلامات التجارية من attribute_id 3 (كما في ProductsBrandService)
    this.productsBrandService.getBrandInfoBySlug('').subscribe({
      next: () => {
        // هذا طلب مجرد لتأكيد عمل الخدمة، ثم نحصل على البيانات باستخدام طلب مخصص
        this.loadBrandsFromAttribute();
      },
      error: () => {
        console.error('Error loading brands');
        // استخدام بيانات احتياطية في حالة الفشل
        this.useFallbackBrands();
      }
    });
  }

  loadBrandsFromAttribute(): void {
    // استخدام الطلب المباشر للحصول على البيانات من الـAPI
    fetch('https://adventures-hub.com/wp-json/wc/v3/products/attributes/3/terms?per_page=12')
      .then(response => response.json())
      .then(data => {
        this.brands = data.map((brand: any) => ({
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          count: brand.count,
          image: brand.image || undefined
        }));
        setTimeout(() => this.setCarouselParameters(), 100);
      })
      .catch(error => {
        console.error('Error fetching brands:', error);
        this.useFallbackBrands();
      });
  }

  useFallbackBrands(): void {
    // بيانات احتياطية للعلامات التجارية مع صور
    this.brands = [
      {
        id: 1056,
        name: "AQUAGLIDE",
        slug: "aquaglide",
        count: 5,
        image: {
          id: "133634",
          url: "https://adventures-hub.com/wp-content/uploads/2025/01/9368_637097563536165016.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1057,
        name: "PATAGONIA",
        slug: "patagonia",
        count: 7,
        image: {
          id: "133635",
          url: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Patagonia_logo.svg",
          width: 500,
          height: 500
        }
      },
      {
        id: 1058,
        name: "THE NORTH FACE",
        slug: "the-north-face",
        count: 8,
        image: {
          id: "133636",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/The_North_Face_logo.svg/1200px-The_North_Face_logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1059,
        name: "COLUMBIA",
        slug: "columbia",
        count: 6,
        image: {
          id: "133637",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Columbia_Sportswear_logo.svg/1200px-Columbia_Sportswear_logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1060,
        name: "SALOMON",
        slug: "salomon",
        count: 9,
        image: {
          id: "133638",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Salomon_logo.svg/1200px-Salomon_logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1061,
        name: "MERRELL",
        slug: "merrell",
        count: 4,
        image: {
          id: "133639",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Merrell_Logo.svg/1200px-Merrell_Logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1062,
        name: "ADIDAS",
        slug: "adidas",
        count: 10,
        image: {
          id: "133640",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/1200px-Adidas_Logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1063,
        name: "NIKE",
        slug: "nike",
        count: 12,
        image: {
          id: "133641",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/1200px-Logo_NIKE.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1064,
        name: "UNDER ARMOUR",
        slug: "under-armour",
        count: 8,
        image: {
          id: "133642",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Under_armour_logo.svg/1200px-Under_armour_logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1065,
        name: "PUMA",
        slug: "puma",
        count: 7,
        image: {
          id: "133643",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Puma_logo.svg/1200px-Puma_logo.svg.png",
          width: 500,
          height: 500
        }
      },
      {
        id: 1066,
        name: "REEBOK",
        slug: "reebok",
        count: 6,
        image: {
          id: "133644",
          url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Reebok_logo.svg/1280px-Reebok_logo.svg.png",
          width: 500,
          height: 500
        }
      }
    ];
    setTimeout(() => this.setCarouselParameters(), 100);
  }

  setCarouselParameters(): void {
    const itemWidth = this.getItemWidth();
    this.totalWidth = itemWidth * this.brands.length;
    this.currentPosition = 0; // Reset position
  }

  getItemWidth(): number {
    if (this.screenWidth < 640) {
      return this.screenWidth / 3; // 3 items per view on mobile
    } else if (this.screenWidth < 768) {
      return this.screenWidth / 4; // 4 items per view on small tablets
    } else if (this.screenWidth < 1024) {
      return this.screenWidth / 5; // 5 items per view on tablets
    } else {
      return this.screenWidth / 8; // 8 items per view on desktop
    }
  }

  getVisibleItems(): number {
    if (this.screenWidth < 640) {
      return 3;
    } else if (this.screenWidth < 768) {
      return 4;
    } else if (this.screenWidth < 1024) {
      return 5;
    } else {
      return 8;
    }
  }

  next(): void {
    const itemWidth = this.getItemWidth();
    const maxPosition = this.totalWidth - (this.getVisibleItems() * itemWidth);

    if (this.currentPosition < maxPosition) {
      this.currentPosition += itemWidth * Math.min(3, this.getVisibleItems());

      // Don't go beyond the end
      if (this.currentPosition > maxPosition) {
        this.currentPosition = maxPosition;
      }
    }
  }

  prev(): void {
    const itemWidth = this.getItemWidth();

    if (this.currentPosition > 0) {
      this.currentPosition -= itemWidth * Math.min(3, this.getVisibleItems());

      // Don't go beyond the start
      if (this.currentPosition < 0) {
        this.currentPosition = 0;
      }
    }
  }
}
