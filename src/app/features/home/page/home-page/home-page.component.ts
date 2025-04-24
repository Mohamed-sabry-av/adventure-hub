import { Component, inject } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { SliderComponent } from '../../components/slider/slider.component';
import { BrandLogosComponent } from '../../components/brand-logos/brand-logos.component';
import { RelatedCategoriesComponent } from '../../components/related-categories/related-categories.component';
import { NewProductsComponent } from '../../components/new-products/new-products.component';
import { RecommendedProductsComponent } from '../../components/recommended-products/recommended-products.component';
import { SaleProductsComponent } from '../../components/sale-products/sale-products.component';
import { AppContainerComponent } from '../../../../shared/components/app-container/app-container.component';
import { DialogErrorComponent } from '../../../../shared/components/dialog-error/dialog-error.component';
import { UIService } from '../../../../shared/services/ui.service';
import { Observable } from 'rxjs';
import { CartStatus } from '../../../cart/model/cart.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    SliderComponent,
    BrandLogosComponent,
    RelatedCategoriesComponent,
    NewProductsComponent,
    RecommendedProductsComponent,
    SaleProductsComponent,
    AppContainerComponent,
    DialogErrorComponent,
    AsyncPipe,
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
})
export class HomePageComponent {
  private uiService = inject(UIService);

  cartStatus$: Observable<CartStatus> = this.uiService.cartStatus$;
}
