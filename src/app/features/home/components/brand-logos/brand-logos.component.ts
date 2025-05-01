import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeService } from '../../service/home.service';
import { RouterModule } from '@angular/router';

interface Brand {
  id: number;
  name: string;
  slug: string;
  count: number;
  logoUrl?: string;
}

@Component({
  selector: 'app-brand-logos',
  standalone: true,
  imports: [CommonModule, RouterModule],

  template: `
    <div class="brand-logos py-6 px-4 bg-white">
      <div class="container mx-auto">
        <div
          class="brands-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center justify-items-center"
        >
          @for (brand of topBrands; track brand.id) {
          <a
            [routerLink]="['/brand', brand.slug]"
            class="brand-logo flex items-center justify-center h-16 w-full p-2 grayscale hover:grayscale-0 transition-all duration-300"
          >
            @if (brand.logoUrl) {
            <img
              [src]="brand.logoUrl"
              [alt]="brand.name"
              class="max-h-full max-w-full object-contain"
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
        border-radius: 4px;
      }

      .brand-logo:hover {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
      }
    `,
  ],
})
export class BrandLogosComponent implements OnInit {
  // قائمة الماركات مع روابط الشعارات
  brandLogos: { [key: string]: string } = {
    nike: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/1200px-Logo_NIKE.svg.png',
    adidas:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/1200px-Adidas_Logo.svg.png',
    'the-north-face':
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/The_North_Face_logo.svg/1200px-The_North_Face_logo.svg.png',
    'under-armour':
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Under_armour_logo.svg/1200px-Under_armour_logo.svg.png',
    patagonia:
      'https://upload.wikimedia.org/wikipedia/commons/0/0b/Patagonia_logo.svg',
    columbia:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Columbia_Sportswear_logo.svg/1200px-Columbia_Sportswear_logo.svg.png',
    rei: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/REI_Co-op_logo.svg',
    marmot:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Marmot_Logo.svg/1200px-Marmot_Logo.svg.png',
    salomon:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Salomon_logo.svg/1200px-Salomon_logo.svg.png',
    merrell:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Merrell_Logo.svg/1200px-Merrell_Logo.svg.png',
  };

  topBrands: Brand[] = [];

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadBrands();
  }

  loadBrands(): void {
    this.homeService.getBrands(12).subscribe((brands: any[]) => {
      this.topBrands = brands
        .map((brand: any) => {
          const logoSlug = brand.slug.toLowerCase();
          return {
            ...brand,
            logoUrl: this.brandLogos[logoSlug] || undefined,
          };
        })
        .slice(0, 12);
    });
  }
}
