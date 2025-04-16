import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-recommended-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './recommended-products.component.html',
  styleUrls: ['./recommended-products.component.css']
})
export class RecommendedProductsComponent implements OnInit {
  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  constructor(private homeService: HomeService) {}
  
  ngOnInit(): void {
    this.loadRecommendedProducts();
  }
  
  loadRecommendedProducts(): void {
    this.loading = true;
    this.homeService.getFeaturedProducts(1, 8).subscribe({
      next: (data:any) => {
        this.products = data;
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to load recommended products';
        this.loading = false;
        console.error('Error loading recommended products:', err);
      }
    });
  }
}