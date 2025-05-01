import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecentlyVisitedService } from '../../../../core/services/recently-visited.service';
import { Product } from '../../../../interfaces/product';
import { Observable } from 'rxjs';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-recently-visited',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './recently-visited.component.html',

  styleUrls: ['./recently-visited.component.css'],
})
export class RecentlyVisitedComponent implements OnInit {
  recentlyVisitedProducts$!: Observable<Product[]>;

  constructor(private recentlyVisitedService: RecentlyVisitedService) {}

  ngOnInit(): void {
    this.recentlyVisitedProducts$ =
      this.recentlyVisitedService.recentlyVisitedProducts$;
  }

  clearHistory(): void {
    this.recentlyVisitedService.clearHistory();
  }

  removeProduct(productId: number): void {
    this.recentlyVisitedService.removeProduct(productId);
  }
}
