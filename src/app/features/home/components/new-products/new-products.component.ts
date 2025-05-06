import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CustomCarouselComponent } from '../custom-carousel/custom-carousel.component';

@Component({
  selector: 'app-new-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, CustomCarouselComponent],
  templateUrl: './new-products.component.html',
  styleUrls: ['./new-products.component.css'],
})
export class NewProductsComponent implements OnInit {
  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  screenWidth: number = window.innerWidth;

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 4,
      numScroll: 1,
    },
    {
      breakpoint: '991px',
      numVisible: 3,
      numScroll: 1,
    },
    {
      breakpoint: '767px',
      numVisible: 2.5,
      numScroll: 1,
    },
    {
      breakpoint: '575px',
      numVisible: 2, // تأكيد عرض منتجين على الهاتف
      numScroll: 1,
    },
  ];

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadNewProducts();
    this.screenWidth = window.innerWidth;
  }

  loadNewProducts(): void {
    this.loading = true;
    this.homeService.getNewArrivalsProducts(1, 13).subscribe({
      next: (data: any) => {
        this.products = data;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load new products';
        this.loading = false;
        console.error('Error loading new products:', err);
      },
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  getVisibleItemsCount(): number {
    if (this.screenWidth < 576) {
      return 2; // Mobile
    } else if (this.screenWidth < 768) {
      return 2.5; // Small tablet
    } else if (this.screenWidth < 992) {
      return 3; // Tablet
    } else {
      return 4; // Desktop
    }
  }
}
