import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../../../core/services/filter.service';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { TransferState, makeStateKey } from '@angular/core';
import { CacheService } from '../../../../core/services/cashing.service';
import { Observable } from 'rxjs';
import { ProductsBrandService } from '../../services/products-brand.service';

interface AttributesResponse {
  [key: string]: { name: string; terms: { id: number; name: string }[] };
}

interface Attribute {
  slug: string;
  name: string;
  terms: { id: number; name: string }[];
}

interface CachedAttributes {
  attributes: AttributesResponse;
  totalPages: number;
}

const ATTRIBUTES_KEY = (id: number, type: 'category' | 'brand') => makeStateKey<Attribute[]>(`${type}_attributes_${id}`);

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbRoutesComponent],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush 
})
export class FilterSidebarComponent implements OnInit {
  @Input() categoryId: number | null = null;
  @Input() brandTermId: number | null = null;
  @Output() filtersChanges = new EventEmitter<{ [key: string]: string[] }>();

  attributes: Attribute[] = [];
  selectedFilters: { [key: string]: string[] } = {};
  openSections: { [key: string]: boolean } = {};
  showAll: { [key: string]: boolean } = {};
  isLoadingAttributes = true;

  constructor(
    private filterService: FilterService,
    private transferState: TransferState,
    private cacheService: CacheService,
    private cdr: ChangeDetectorRef,
    private productsByBrandService: ProductsBrandService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    console.log('ngOnInit called with categoryId:', this.categoryId, 'brandTermId:', this.brandTermId);
    this.loadAttributes();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('ngOnChanges called with changes:', changes);
    if (
      (changes['categoryId'] && !changes['categoryId'].firstChange) ||
      (changes['brandTermId'] && !changes['brandTermId'].firstChange)
    ) {
      this.selectedFilters = {};
      this.openSections = {};
      this.showAll = {};
      this.isLoadingAttributes = true;
      this.attributes = [];
      this.loadAttributes();
    }
  }

  private loadAttributes(): void {
    console.log('loadAttributes called with categoryId:', this.categoryId, 'brandTermId:', this.brandTermId);
    this.isLoadingAttributes = true;

    const id = this.categoryId !== null && this.categoryId !== undefined ? this.categoryId : this.brandTermId;
    const type = this.categoryId !== null && this.categoryId !== undefined ? 'category' : 'brand';

    if (id === null || id === undefined) {
      console.log('No valid ID provided, exiting loadAttributes');
      this.isLoadingAttributes = false;
      this.attributes = [];
      this.cdr.markForCheck();
      return;
    }

    const attributesKey = ATTRIBUTES_KEY(id, type);
    const cacheKey = `attributes_terms_${type}_${id}_page_1`;
    const cachedValue = this.cacheService.get(cacheKey);

    if (cachedValue) {
      console.log('Using cached value:', cachedValue);
      this.attributes = this.processAttributesData(cachedValue, type);
      this.isLoadingAttributes = false;
      this.initializeSections();
      this.cdr.markForCheck();
      return;
    }

    const stateAttributes = this.transferState.get(attributesKey, null as any);
    if (stateAttributes) {
      console.log('Using transfer state attributes:', stateAttributes);
      this.attributes = stateAttributes;
      this.isLoadingAttributes = false;
      this.initializeSections();
      this.cdr.markForCheck();
      return;
    }

    console.log(`Subscribing to ${type} service for ID ${id}`);
    if (type === 'category') {
      this.filterService.getAttributesAndTermsByCategory(id).subscribe({
        next: (data) => {
          console.log('Data from FilterService:', data);
          this.attributes = this.processAttributesData(data, type);
          this.cacheService.set(cacheKey, data, 300000);
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(attributesKey, this.attributes);
          }
          this.isLoadingAttributes = false;
          this.initializeSections();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error from FilterService:', error);
          this.attributes = [];
          this.isLoadingAttributes = false;
          this.cdr.markForCheck();
        },
        complete: () => console.log('FilterService observable completed'),
      });
    } else {
      this.productsByBrandService.getAllAttributesAndTermsByBrand(id).subscribe({
        next: (data) => {
          console.log('Data from ProductsBrandService:', data);
          this.attributes = this.processAttributesData(data, type);
          this.cacheService.set(cacheKey, data, 300000);
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(attributesKey, this.attributes);
          }
          this.isLoadingAttributes = false;
          this.initializeSections();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error from ProductsBrandService:', error);
          this.attributes = [];
          this.isLoadingAttributes = false;
          this.cdr.markForCheck();
        },
        complete: () => console.log('ProductsBrandService observable completed'),
      });
    }
  }

  private processAttributesData(data: any, type: 'category' | 'brand'): Attribute[] {
    const attributes = type === 'category' ? data.attributes : data;
    console.log('Processed attributes data:', attributes);
    return attributes
      ? Object.entries(attributes).map(([slug, attrData]: [string, any]) => ({
          slug,
          name: attrData.name,
          terms: attrData.terms,
        }))
      : [];
  }

  private initializeSections() {
    this.attributes.forEach((attr) => {
      this.openSections[attr.slug] = false;
      this.showAll[attr.slug] = false;
    });
  }

  toggleSection(slug: string) {
    this.openSections[slug] = !this.openSections[slug];
    this.cdr.markForCheck();
  }

  onFilterChange(attrSlug: string, termId: number) {
    if (!this.selectedFilters[attrSlug]) {
      this.selectedFilters[attrSlug] = [];
    }
    const termIdStr = termId.toString();
    if (this.selectedFilters[attrSlug].includes(termIdStr)) {
      this.selectedFilters[attrSlug] = this.selectedFilters[attrSlug].filter((id) => id !== termIdStr);
    } else {
      this.selectedFilters[attrSlug].push(termIdStr);
    }
    if (this.selectedFilters[attrSlug].length === 0) {
      delete this.selectedFilters[attrSlug];
    }

    this.filtersChanges.emit({ ...this.selectedFilters });
    this.updateAvailableAttributes(attrSlug);
    this.cdr.markForCheck();
  }

  private updateAvailableAttributes(selectedAttrSlug: string): void {
    const id = this.categoryId !== null && this.categoryId !== undefined ? this.categoryId : this.brandTermId;
    const type = this.categoryId !== null && this.categoryId !== undefined ? 'category' : 'brand';

    if (!id) return;

    const observable = type === 'category'
      ? this.filterService.getAvailableAttributesAndTerms(id, this.selectedFilters)
      : this.productsByBrandService.getAvailableAttributesAndTermsByBrand(id, this.selectedFilters);

    observable.subscribe({
      next: (attributesData) => {
        console.log('Updated attributes data:', attributesData);
        const selectedAttr = this.attributes.find((attr) => attr.slug === selectedAttrSlug);
        this.attributes = attributesData
          ? Object.entries(attributesData).map(([slug, data]: [string, any]) => ({
              slug,
              name: data.name,
              terms: slug === selectedAttrSlug && selectedAttr ? selectedAttr.terms : data.terms,
            }))
          : this.attributes;
        this.cdr.markForCheck();
      },
      error: (error) => console.error('Error updating attributes:', error),
    });
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) || false;
  }

  private isObservable(obj: any): obj is Observable<any> {
    return obj && typeof obj.subscribe === 'function';
  }
}