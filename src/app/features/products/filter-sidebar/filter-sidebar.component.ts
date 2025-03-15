import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { CategoriesService } from '../../../core/services/categories.service';
import { ProductService } from '../../../core/services/product.service';
import { FilterService } from '../../../core/services/filter.service';

interface Attribute {
  name?: string;
  slug: string;
  terms: { id: string; name: string }[];
}

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbRoutesComponent],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css'],
})
export class FilterSidebarComponent{
  @Input() categoryId: number | null = null;
  @Output() filtersChanges = new EventEmitter<{ [key: string]: string[] }>();

  attributes: { slug: string; name: string; terms: { id: number; name: string }[] }[] = [];
  selectedFilters: { [key: string]: string[] } = {};

  constructor(private filterService: FilterService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryId'] && this.categoryId) {
      this.selectedFilters = {}; // ارجع الفلاتر للصفر لما الـ category يتغير
      this.loadAttributes();
    }
  }

  private loadAttributes() {
    if (this.categoryId) {
      this.filterService.getAllAttributesAndTermsByCategory(this.categoryId).subscribe({
        next: (attributes) => {
          this.attributes = Object.entries(attributes).map(([slug, data]) => ({
            slug,
            name: data.name,
            terms: data.terms
          }));
        },
        error: (error) => {
          console.error('Error loading attributes:', error);
          this.attributes = [];
        }
      });
    }
  }

  onFilterChange(attrSlug: string, termId: number) {
    if (!this.selectedFilters[attrSlug]) {
      this.selectedFilters[attrSlug] = [];
    }
    const termIdStr = termId.toString();
    if (this.selectedFilters[attrSlug].includes(termIdStr)) {
      this.selectedFilters[attrSlug] = this.selectedFilters[attrSlug].filter(id => id !== termIdStr);
    } else {
      this.selectedFilters[attrSlug].push(termIdStr);
    }
    if (this.selectedFilters[attrSlug].length === 0) {
      delete this.selectedFilters[attrSlug];
    }
    this.filtersChanges.emit({ ...this.selectedFilters });
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) || false;
  }
}