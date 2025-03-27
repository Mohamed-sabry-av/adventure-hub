import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../../../core/services/product.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-product-related',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-related.component.html',
  styleUrls: ['./product-related.component.css'],
})
export class ProductRelatedComponent implements OnInit {
  private productService = inject(ProductService);

  relatedProducts: any[] = [];

  ngOnInit() {
    this.productService.getProductById(2141)
      .pipe(
        map(product => product.related_ids || [])
      )
      .subscribe(products => {
        this.relatedProducts = products;
      });
  }
}
