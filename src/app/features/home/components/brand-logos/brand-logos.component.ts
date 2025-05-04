import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
        <h2 class="text-2xl font-bold mb-6 text-center">Featured Brands</h2>
        <div
          class="brands-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center justify-items-center"
        >
          @for (brand of brands; track brand.id) {
          <a
            [routerLink]="['/brand', brand.slug]"
            class="brand-logo flex items-center justify-center h-20 w-full p-2 transition-all duration-300 hover:shadow-md"
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
    </div>
  `,
  styles: [
    `
      .brand-logo {
        border: 1px solid #f0f0f0;
        border-radius: 8px;
      }

      .brand-image {
        filter: grayscale(100%);
      }

      .brand-logo:hover .brand-image {
        filter: grayscale(0%);
      }
    `,
  ],
})
export class BrandLogosComponent implements OnInit {
  private productsBrandService = inject(ProductsBrandService);

  brands: Brand[] = [];

  ngOnInit(): void {
    this.loadBrands();
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
      }
    ];
  }
}
