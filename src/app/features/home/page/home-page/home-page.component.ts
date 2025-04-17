import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SliderComponent } from '../../components/slider/slider.component';
import { BrandLogosComponent } from '../../components/brand-logos/brand-logos.component';
import { RelatedCategoriesComponent } from '../../components/related-categories/related-categories.component';
import { NewProductsComponent } from '../../components/new-products/new-products.component';
import { RecommendedProductsComponent } from '../../components/recommended-products/recommended-products.component';
import { SaleProductsComponent } from '../../components/sale-products/sale-products.component';

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
    SaleProductsComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent {
  constructor() {}
}