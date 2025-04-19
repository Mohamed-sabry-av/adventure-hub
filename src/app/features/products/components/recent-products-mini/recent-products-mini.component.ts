import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { Product } from '../../../../interfaces/product';
import { Observable, map } from 'rxjs';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-recent-products-mini',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './recent-products-mini.component.html',
  styleUrls: ['./recent-products-mini.component.css']
})
export class RecentProductsMiniComponent implements OnInit {
  recentProducts$!: Observable<Product[]>;

  constructor(private recentlyVisitedService: RecentlyVisitedService) { }

  ngOnInit(): void {
    // Get only the last 5 recently visited products
    this.recentProducts$ = this.recentlyVisitedService.recentlyVisitedProducts$
      .pipe(
        map(products => products.slice(0, 5))
      );
  }
}
