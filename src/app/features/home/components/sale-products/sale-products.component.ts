import { Component, Input } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { HomeSliderComponent } from '../slider/slider.component';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-sale-products',
  imports: [HomeSliderComponent, AppContainerComponent],
  templateUrl: './sale-products.component.html',
  styleUrl: './sale-products.component.css',
})
export class SaleProductsComponent {
  @Input({ required: true }) saleProducts$!: Observable<any>;
}
