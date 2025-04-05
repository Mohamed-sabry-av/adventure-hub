import { Component, Input } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { HomeSliderComponent } from '../slider/slider.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-recommended-products',
  imports: [HomeSliderComponent, AppContainerComponent],
  templateUrl: './recommended-products.component.html',
  styleUrl: './recommended-products.component.css',
})
export class RecommendedProductsComponent {
  @Input({ required: true }) recommendedProducts$!: Observable<any>;
}
