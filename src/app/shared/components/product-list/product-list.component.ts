import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-product-list',
  imports: [],
  templateUrl: './product-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,

  styleUrl: './product-list.component.css',
})
export class ProductListComponent {}
