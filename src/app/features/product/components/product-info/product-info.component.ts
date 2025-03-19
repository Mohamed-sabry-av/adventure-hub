import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-info',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './product-info.component.html',
  styleUrl: './product-info.component.css',
})
export class ProductInfoComponent {
  productInfo = input<any>();

  images: string[] = ['slider/1.webp', 'slider/2.webp'];
  maxLength: number = 10;
  quantity: number = 1;

  ngOnInit() {
    console.log(this.productInfo());
  }

  onQuantityUp() {
    if (this.quantity < this.maxLength) {
      this.quantity++;
    }
  }

  onQuantityDown() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  get productSku() {
    const shortTitle = this.productInfo().name.split(' ').slice(0, 2).join('');
    const sku = this.productInfo().sku;
    return { shortTitle, sku };
  }
}
