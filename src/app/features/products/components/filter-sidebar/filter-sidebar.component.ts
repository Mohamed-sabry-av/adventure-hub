import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../../../core/services/filter.service';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { TransferState, makeStateKey } from '@angular/core';
import { CacheService } from '../../../../core/services/cashing.service';
import { Observable } from 'rxjs';
import { FilterAttributesPipe } from '../../../../shared/pipes/filter-attributes.pipe';

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

const ATTRIBUTES_KEY = (categoryId: number) => makeStateKey<Attribute[]>(`attributes_${categoryId}`);

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
    private cdr: ChangeDetectorRef, // لتحديث الـ UI يدويًا مع OnPush
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  async ngOnInit() {
    await this.loadAttributes();
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryId'] && !changes['categoryId'].firstChange && this.categoryId !== null) {
      this.selectedFilters = {};
      this.openSections = {};
      this.showAll = {};
      this.isLoadingAttributes = true;
      this.attributes = [];
      await this.loadAttributes();
    }
  }

  private async loadAttributes(): Promise<void> {
    if (this.categoryId === null || this.categoryId === undefined) {
      this.isLoadingAttributes = false;
      this.attributes = [];
      this.cdr.markForCheck(); // تحديث الـ UI
      return;
    }

    const attributesKey = ATTRIBUTES_KEY(this.categoryId);
    const cachedValue = this.cacheService.get(`attributes_terms_category_${this.categoryId}_page_1`);

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
        this.cdr.markForCheck(); // تحديث الـ UI
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
      this.cdr.markForCheck(); // تحديث الـ UI
      return;
    }

    this.isLoadingAttributes = true;
    try {
      const attributesData = await this.filterService.getAllAttributesAndTermsByCategory(this.categoryId).toPromise() as AttributesResponse | undefined;
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
      this.cacheService.set(`attributes_terms_category_${this.categoryId}_page_1`, { attributes: attributesData }, 300000);
      this.initializeSections();
    } catch (error) {
      console.error('Error loading initial attributes:', error);
      this.attributes = [];
    } finally {
      this.isLoadingAttributes = false;
      this.cdr.markForCheck(); // تحديث الـ UI
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
    this.cdr.markForCheck(); // تحديث الـ UI
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
    this.cdr.markForCheck(); // تحديث الـ UI
  }

  private async updateAvailableAttributes(selectedAttrSlug: string): Promise<void> {
    if (!this.categoryId) return;

    try {
      const attributesData = await this.filterService.getAvailableAttributesAndTerms(this.categoryId, this.selectedFilters).toPromise() as AttributesResponse | undefined;
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