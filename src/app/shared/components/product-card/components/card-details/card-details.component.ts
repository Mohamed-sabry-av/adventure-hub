import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../../../interfaces/product';

@Component({
  selector: 'app-card-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-details.component.html',
  styleUrls: ['./card-details.component.css']
})
export class CardDetailsComponent {
  @Input() product!: Product;
  @Input() colorOptions: { color: string; image: string; inStock: boolean }[] = [];
  @Input() uniqueSizes: { size: string; inStock: boolean }[] = [];
  @Input() getBrandName!: () => string | null;
}