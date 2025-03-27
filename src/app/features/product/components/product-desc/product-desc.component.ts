import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-desc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-desc.component.html',
  styleUrl: './product-desc.component.css',
})
export class ProductDescComponent {
  productAdditionlInfo = input<any>();
  activeTab: 'description' | 'specifications' = 'description';

  setActiveTab(tab: 'description' | 'specifications'): void {
    this.activeTab = tab;
  }
}
