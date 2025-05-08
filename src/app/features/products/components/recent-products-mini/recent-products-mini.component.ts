import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { Product } from '../../../../interfaces/product';
import { Observable, map } from 'rxjs';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o'; // استبدال CustomCarouselComponent

@Component({
  selector: 'app-recent-products-mini',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, CarouselModule], // استبدال CustomCarouselComponent
  templateUrl: './recent-products-mini.component.html',
  styleUrls: ['./recent-products-mini.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentProductsMiniComponent implements OnInit {
  recentProducts$!: Observable<Product[]>;

  // إعدادات الـ Carousel
  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: true,
    navSpeed: 700,
    navText: ['<i class="fas fa-chevron-left"></i>', '<i class="fas fa-chevron-right"></i>'],
    responsive: {
      0: {
        items: 2,
      },
      480: {
        items: 2,
      },
      768: {
        items: 2,
      },
      1024: {
        items: 4,
      },
      1400: {
        items: 4,
      },
    },
    nav: true,
  };

  constructor(private recentlyVisitedService: RecentlyVisitedService) {}

  ngOnInit(): void {
    this.recentProducts$ = this.recentlyVisitedService.recentlyVisitedProducts$.pipe(
      map((products) => products.slice(0, 8))
    );
  }
}