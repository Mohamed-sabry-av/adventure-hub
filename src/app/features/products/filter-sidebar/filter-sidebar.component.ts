import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { CategoriesService } from '../../../core/services/categories.service';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbRoutesComponent],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css']
})
export class FilterSidebarComponent {
  @Input() categoryId : number|null = null;
  @Output() categoryIdChange = new EventEmitter<number |null>()

  constructor(categoriesService: CategoriesService){}

  sizes = ['S', 'M', 'L', 'XL'];
  categories = [
    { id: 1, name: 'Men', count: 45 },
    { id: 2, name: 'Women', count: 32 }
  ];

  applyFilters() {

  }
  onCategoryChange(newCategoryId: number|null){
    console.log('Category changed to:', newCategoryId);
    this.categoryId = newCategoryId;
    this.categoryIdChange.emit(newCategoryId);
  }

}