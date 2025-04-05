import { Component, Input } from '@angular/core';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { HomeSliderComponent } from '../slider/slider.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-new-products',
  imports: [HomeSliderComponent, AppContainerComponent],
  templateUrl: './new-products.component.html',
  styleUrl: './new-products.component.css',
})
export class NewProductsComponent {
  @Input({ required: true }) arrivalProducts$!: Observable<any>;
}
