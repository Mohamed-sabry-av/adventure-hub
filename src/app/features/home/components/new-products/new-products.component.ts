import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { ProductCardComponent } from '../../../../shared/components/product-card/page/product-card.component';

@Component({
  selector: 'app-new-products',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductCardComponent],
  templateUrl: './new-products.component.html',
  styleUrls: ['./new-products.component.css']
})
export class NewProductsComponent implements OnInit {
  products: any[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  constructor(private homeService: HomeService) {}
  
  ngOnInit(): void {
    this.loadNewProducts();
  }
  
  loadNewProducts(): void {
    this.loading = true;
    this.homeService.getNewArrivalsProducts(1, 8).subscribe({
      next: (data:any) => {
        this.products = data;
        this.loading = false;
      },
      error: (err:any) => {
        this.error = 'Failed to load new products';
        this.loading = false;
        console.error('Error loading new products:', err);
      }
    });
  }
}