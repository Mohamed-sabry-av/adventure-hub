import {
  Component,
  Input,
  Output,
  EventEmitter,
  Attribute,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { CategoriesService } from '../../../core/services/categories.service';
import { ProductService } from '../../../core/services/product.service';
import { FilterService } from '../../../core/services/filter.service';

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbRoutesComponent],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css'],
})
export class FilterSidebarComponent implements OnInit {
  
  @Input() categoryId: number | null = null;
  @Output() categoryIdChange = new EventEmitter<number | null>();

  @Output() filtersChanges = new EventEmitter<any>();
  attributes: any[] = [];
  selectedFilters: { [key: string]: string[] } = {};


  constructor(
    private categoriesService: CategoriesService,
    private productsService: ProductService,
    private filterService: FilterService
  ) {}

  ngOnInit() {
    this.loadAttirbutes();
  }

  loadAttirbutes() {
    this.filterService.getProductAttributes().subscribe((attribute) => {
      this.attributes = attribute;
      console.log('Avilable Attributes : ', this.attributes);
    });
  }

  onFilterChange(attributeId:number, term:string){
    if(!this.selectedFilters[attributeId]){
      this.selectedFilters[attributeId] = [];
    }

    const index =this.selectedFilters[attributeId].indexOf(term)

    if(index === -1){
      this.selectedFilters[attributeId].push(term)
    }else{
      this.selectedFilters[attributeId].splice(index,1)
    }
    this.filtersChanges.emit(this.selectedFilters)
  }


  onCategoryChange(newCategoryId: number | null) {
    console.log('Category changed to:', newCategoryId);
    this.categoryId = newCategoryId;
    this.categoryIdChange.emit(newCategoryId);
  }
}
