import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { catchError, forkJoin, of } from 'rxjs';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';

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
  imports: [CommonModule, RouterModule, CarouselModule],
  template: `
<div class="brand-logos py-2 px-2 bg-white">
  <div class="container mx-auto">
    @if (brands.length > 0) {
      <div class="brands-carousel relative">
        <owl-carousel-o [options]="carouselOptions">
          @for (brand of brands; track brand.id) {
            <ng-template carouselSlide [id:string]="brand.id">
              <a
                [routerLink]="['/brand', brand.slug]"
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
    } @else {
      <div class="text-center text-gray-500">No brands available at the moment.</div>
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
    `,
  ],
  // changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrandLogosComponent implements OnInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);

  private readonly allowedBrandIds = [550, 5126, 1126, 2461, 1441, 989, 877, 971, 3537];

  brands: Brand[] = [];

  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false, // إخفاء النقاط
    nav: false, // إخفاء الأزرار
    autoplay: true, // التمرير التلقائي
    autoplayTimeout: 3000, // زمن التمرير التلقائي (3 ثواني)
    autoplayHoverPause: true, // إيقاف التمرير عند الـ hover
    navSpeed: 700,
    responsive: {
      0: {
        items: 3, // 3 براندات على الشاشات الصغيرة
      },
      640: {
        items: 4, // 4 براندات على الشاشات المتوسطة
      },
      768: {
        items: 5, // 5 براندات على الشاشات الأكبر
      },
      1024: {
        items: 8, // 8 براندات على الشاشات الكبيرة
      },
    },
  };

  ngOnInit(): void {
    this.loadBrands();
  }

  loadBrands(): void {
    const brandObservables = this.allowedBrandIds.map(id =>
      this.homeService.getBrandById(id).pipe(
        catchError(error => {
          return of(null);
        })
      )
    );

    forkJoin(brandObservables).subscribe({
      next: (brands: Brand[]) => {
        this.brands = brands.filter(brand => brand !== null);
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.brands = [];
        this.cdr.markForCheck();
      },
    });
  }}
