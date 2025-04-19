import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { Product } from '../../../../interfaces/product';
import { Observable, map } from 'rxjs';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';
import { CarouselModule } from 'primeng/carousel';

@Component({
  selector: 'app-recent-products-mini',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent, CarouselModule],
  templateUrl: './recent-products-mini.component.html',
  styleUrls: ['./recent-products-mini.component.css']
})
export class RecentProductsMiniComponent implements OnInit {
  recentProducts$!: Observable<Product[]>;
  
  responsiveOptions = [
    { 
      breakpoint: '1400px', 
      numVisible: 4, 
      numScroll: 1 
    },
    { 
      breakpoint: '1024px', 
      numVisible: 3, 
      numScroll: 1 
    },
    { 
      breakpoint: '768px', 
      numVisible: 2, 
      numScroll: 1 
    },
    { 
      breakpoint: '480px', 
      numVisible: 1, 
      numScroll: 1,
      showIndicators: true
    }
  ];

  constructor(private recentlyVisitedService: RecentlyVisitedService) { }

  ngOnInit(): void {
    // Get only the last 8 recently visited products
    this.recentProducts$ = this.recentlyVisitedService.recentlyVisitedProducts$
      .pipe(
        map(products => products.slice(0, 8))
      );
  }
}