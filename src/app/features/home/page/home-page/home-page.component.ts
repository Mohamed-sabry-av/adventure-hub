import { Component } from '@angular/core';
import { RelatedCategoriesComponent } from '../../components/related-categories/related-categories.component';
import { MainSliderComponent } from '../../components/main-slider/main-slider.component';
import { RecommendedProductsComponent } from '../../components/recommended-products/recommended-products.component';
import { NewProductsComponent } from '../../components/new-products/new-products.component';
import { AboutComponent } from '../../components/about/about.component';
import { HomeService } from '../../service/home.service';
import { Observable, of } from 'rxjs';
import { SaleProductsComponent } from '../../components/sale-products/sale-products.component';

@Component({
  selector: 'app-home-page',
  imports: [
    RelatedCategoriesComponent,
    MainSliderComponent,
    RecommendedProductsComponent,
    NewProductsComponent,
    AboutComponent,
    SaleProductsComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {
  newArrivalsProducts$: Observable<any> = of([]);
  featuredProducts$: Observable<any> = of([]);
  saleProducts$: Observable<any> = of([]);

  constructor(private homeService: HomeService) {}

  ngOnInit() {
    this.newArrivalsProducts$ = this.homeService.getNewArrivalsProducts();
    this.featuredProducts$ = this.homeService.getFeaturedProducts();
    this.saleProducts$ = this.homeService.getSaleProducts();
  }
}
