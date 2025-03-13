import { Component, input } from '@angular/core';
import { TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-product-desc',
  imports: [TabsModule],
  templateUrl: './product-desc.component.html',
  styleUrl: './product-desc.component.css',
})
export class ProductDescComponent {
  productAdditionlInfo = input<any>();
}
