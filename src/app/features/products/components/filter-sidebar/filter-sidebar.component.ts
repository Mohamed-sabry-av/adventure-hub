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
  @Input() brandTermId: number | null = null; // إضافة دعم لـ brandTermId
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
    private productsByBrandService : ProductsBrandService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit() {
    await this.loadAttributes();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['categoryId'] && !changes['categoryId'].firstChange) ||
      (changes['brandTermId'] && !changes['brandTermId'].firstChange)
    ) {
      this.selectedFilters = {};
      this.openSections = {};
      this.showAll = {};
      this.isLoadingAttributes = true;
      this.attributes = [];
      await this.loadAttributes();
    }
  }

  private async loadAttributes(): Promise<void> {
    console.log('loadAttributes called with categoryId:', this.categoryId, 'brandTermId:', this.brandTermId); // تحقق من الاستدعاء
    this.isLoadingAttributes = true;

    // تحديد المعرف ونوعه (فئة أو علامة تجارية)
    const id = this.categoryId !== null && this.categoryId !== undefined ? this.categoryId : this.brandTermId;
    const type = this.categoryId !== null && this.categoryId !== undefined ? 'category' : 'brand';

    if (id === null || id === undefined) {
      this.isLoadingAttributes = false;
      this.attributes = [];
      this.cdr.markForCheck();
      return;
    }

    const attributesKey = ATTRIBUTES_KEY(id, type);
    const cacheKey = `attributes_terms_${type}_${id}_page_1`;
    const cachedValue = this.cacheService.get(cacheKey);

    if (cachedValue) {
      try {
        if (this.isObservable(cachedValue)) {
          const cachedData = await (cachedValue as Observable<CachedAttributes>).toPromise();
          this.attributes = cachedData
            ? Object.entries(cachedData.attributes).map(([slug, data]) => ({
                slug,
                name: data.name,
                terms: data.terms,
              }))
            : [];
        } else {
          const cachedAttributes = cachedValue as CachedAttributes;
          this.attributes = Object.entries(cachedAttributes.attributes).map(([slug, data]) => ({
            slug,
            name: data.name,
            terms: data.terms,
          }));
        }
        this.isLoadingAttributes = false;
        this.initializeSections();
        this.cdr.markForCheck();
        return;
      } catch (error) {
        console.error('Error processing cached attributes:', error);
      }
    }

    const stateAttributes = this.transferState.get(attributesKey, null as any);
    if (stateAttributes) {
      this.attributes = stateAttributes;
      this.isLoadingAttributes = false;
      this.initializeSections();
      this.cdr.markForCheck();
      return;
    }

    try {
      let attributesData: AttributesResponse | undefined;
      if (type === 'category') {
        attributesData = await this.filterService.getAttributesAndTermsByCategory(id).toPromise() as AttributesResponse | undefined;
      } else {
        attributesData = await this.productsByBrandService.getAllAttributesAndTermsByBrand(id).toPromise() as AttributesResponse | undefined;
      }

      this.attributes = attributesData
        ? Object.entries(attributesData).map(([slug, data]) => ({
            slug,
            name: data.name,
            terms: data.terms,
          }))
        : [];
      if (isPlatformServer(this.platformId)) {
        this.transferState.set(attributesKey, this.attributes);
      }
      this.cacheService.set(cacheKey, { attributes: attributesData }, 300000);
      this.initializeSections();
    } catch (error) {
      console.error(`Error loading ${type} attributes:`, error);
      this.attributes = [];
    } finally {
      this.isLoadingAttributes = false;
      this.cdr.markForCheck();
    }
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

  async onFilterChange(attrSlug: string, termId: number) {
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
    await this.updateAvailableAttributes(attrSlug);
    this.cdr.markForCheck();
  }

  private async updateAvailableAttributes(selectedAttrSlug: string): Promise<void> {
    const id = this.categoryId !== null && this.categoryId !== undefined ? this.categoryId : this.brandTermId;
    const type = this.categoryId !== null && this.categoryId !== undefined ? 'category' : 'brand';

    if (!id) return;

    try {
      let attributesData: AttributesResponse | undefined;
      if (type === 'category') {
        attributesData = await this.filterService.getAvailableAttributesAndTerms(id, this.selectedFilters).toPromise() as AttributesResponse | undefined;
      } else {
        attributesData = await this.productsByBrandService.getAvailableAttributesAndTermsByBrand(id, this.selectedFilters).toPromise() as AttributesResponse | undefined;
      }

      const selectedAttr = this.attributes.find((attr) => attr.slug === selectedAttrSlug);
      this.attributes = attributesData
        ? Object.entries(attributesData).map(([slug, data]) => ({
            slug,
            name: data.name,
            terms: slug === selectedAttrSlug && selectedAttr ? selectedAttr.terms : data.terms,
          }))
        : this.attributes;
    } catch (error) {
      console.error('Error updating attributes:', error);
    }
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) || false;
  }

  private isObservable(obj: any): obj is Observable<any> {
    return obj && typeof obj.subscribe === 'function';
  }
}