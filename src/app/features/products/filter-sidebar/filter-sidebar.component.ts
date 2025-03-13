import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { CategoriesService } from '../../../core/services/categories.service';
import { ProductService } from '../../../core/services/product.service';
import { FilterService } from '../../../core/services/filter.service';
import { forkJoin, map, of } from 'rxjs';

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
export class FilterSidebarComponent implements OnInit {
  @Input() categoryId: number | null = null;
  @Output() categoryIdChange = new EventEmitter<number | null>();
  @Output() filtersChanges = new EventEmitter<{ [key: string]: string[] }>();

  attributes: Attribute[] = [];
  selectedFilters: { [key: string]: string[] } = {};

  constructor(
    private categoriesService: CategoriesService,
    private productsService: ProductService,
    private filterService: FilterService
  ) {}

  ngOnInit() {
    this.loadAttributes();
  }

  loadAttributes() {
    if (this.categoryId) {
      this.filterService.getAllAttributesAndTermsByCategory(this.categoryId).subscribe((attributes) => {
        console.log('Attributes from category:', attributes);
        this.filterService.getProductAttributes().subscribe((allAttributes) => {
          const attrMap = new Map<string, number>();
          const slugMap = new Map<number, string>();
          allAttributes.forEach((attr: any) => {
            const key = attr.slug || attr.name;
            attrMap.set(key, attr.id);
            slugMap.set(attr.id, attr.slug || attr.name);
          });

          const termRequests = Object.keys(attributes).map((attrKey) => {
            const attrId = attrMap.get(attrKey);
            if (!attrId) {
              console.warn(`No attribute ID for ${attrKey}`);
              return of({ slug: attrKey, terms: [] });
            }
            return this.filterService.getAllAttributeTerms(attrId).pipe(
              map((terms) => {
                const attrSlug = slugMap.get(attrId);
                if (!attrSlug) {
                  console.error(`No slug found for attribute ID ${attrId}`);
                  return { slug: attrKey, terms: [] };
                }
                // Normalize terms from API and create a map
                const normalizedTermsMap = new Map<string, { id: string; name: string }>();
                terms.forEach((term: any) => {
                  const normalizedTerm = term.name.replace(/\s+/g, ' ').trim().toLowerCase();
                  normalizedTermsMap.set(normalizedTerm, {
                    id: term.id.toString(),
                    name: term.name.trim(),
                  });
                });
                // Normalize product terms and match with all API terms
                const productTerms = attributes[attrKey].map((opt: string) =>
                  opt.replace(/\s+/g, ' ').trim().toLowerCase()
                );
                const filteredTerms = productTerms
                  .map((term) => {
                    const match = normalizedTermsMap.get(term);
                    if (!match) {
                      console.warn(`No match found for product term "${term}" in API terms`);
                    }
                    return match;
                  })
                  .filter((term): term is { id: string; name: string } => !!term);

                console.log(`Slug: ${attrSlug}, Raw terms from API:`, terms);
                console.log(`Slug: ${attrSlug}, Product terms:`, productTerms);
                console.log(`Slug: ${attrSlug}, Filtered terms:`, filteredTerms);
                return { slug: attrSlug, terms: filteredTerms };
              })
            );
          });

          forkJoin(termRequests).subscribe((attrArray) => {
            this.attributes = attrArray.filter((attr) => attr.terms.length > 0);
            console.log('Final attributes:', this.attributes);
          });
        });
      });
    } else {
      this.filterService.getProductAttributes().subscribe((attributes) => {
        this.attributes = attributes.map((attr: any) => ({
          slug: attr.slug || attr.name,
          terms: [],
        }));
        console.log('Attributes without category:', this.attributes);
      });
    }
  }

  
  onFilterChange(attributeSlug: string, termId: string) {
    if (!this.selectedFilters[attributeSlug]) {
      this.selectedFilters[attributeSlug] = [];
    }

    const index = this.selectedFilters[attributeSlug].indexOf(termId);
    if (index === -1) {
      this.selectedFilters[attributeSlug].push(termId);
    } else {
      this.selectedFilters[attributeSlug].splice(index, 1);
    }

    console.log('Emitting filters with IDs:', this.selectedFilters);
    this.filtersChanges.emit(this.selectedFilters);
  }

  onCategoryChange(newCategoryId: number | null) {
    console.log('Category changed to:', newCategoryId);
    this.categoryId = newCategoryId;
    this.categoryIdChange.emit(newCategoryId);
    this.selectedFilters = {};
    this.loadAttributes();
  }
}