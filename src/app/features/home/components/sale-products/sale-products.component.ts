import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-sale-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './sale-products.component.html',
  styleUrls: ['./sale-products.component.css']
})
export class SaleProductsComponent implements OnInit {
  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  constructor(private homeService: HomeService) {}
  
  ngOnInit(): void {
    this.loadSaleProducts();
  }
  
  loadSaleProducts(): void {
    this.loading = true;
    this.homeService.getSaleProducts(1, 8).subscribe({
      next: (data:any) => {
        this.products = data;
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to load sale products';
        this.loading = false;
        console.error('Error loading sale products:', err);
      }
    });
  }
}