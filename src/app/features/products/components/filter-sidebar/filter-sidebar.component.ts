import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformServer } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../../../core/services/filter.service';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { TransferState, makeStateKey } from '@angular/core';
import { CacheService } from '../../../../core/services/cashing.service';
import { Observable } from 'rxjs';

interface Attribute {
  slug: string;
  name: string;
  terms: { id: number; name: string }[];
}

// تعريف نوع البيانات المخزنة في الكاش
interface CachedAttributes {
  attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } };
  totalPages: number;
}

const ATTRIBUTES_KEY = (categoryId: number) => makeStateKey<Attribute[]>(`attributes_${categoryId}`);

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbRoutesComponent],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css'],
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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.loadAttributes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categoryId'] && !changes['categoryId'].firstChange && this.categoryId !== null) {
      this.selectedFilters = {};
      this.openSections = {};
      this.showAll = {};
      this.isLoadingAttributes = true;
      this.attributes = [];
      this.loadAttributes();
    }
  }

  private loadAttributes() {
    if (this.categoryId === null || this.categoryId === undefined) {
      this.isLoadingAttributes = false;
      this.attributes = [];
      return;
    }

    const attributesKey = ATTRIBUTES_KEY(this.categoryId);
    const cachedValue = this.cacheService.get(`attributes_terms_category_${this.categoryId}_page_1`);

    if (cachedValue) {
      // لو الكاش بيرجع Observable، لازم نعمل subscribe
      if (this.isObservable(cachedValue)) {
        cachedValue.subscribe((cachedData: CachedAttributes) => {
          this.attributes = Object.entries(cachedData.attributes).map(([slug, data]) => ({
            slug,
            name: data.name,
            terms: data.terms,
          }));
          this.isLoadingAttributes = false;
          this.initializeSections();
        });
        return;
      } else {
        // لو الكاش بيرجع البيانات النهائية مباشرة
        const cachedAttributes = cachedValue as CachedAttributes;
        this.attributes = Object.entries(cachedAttributes.attributes).map(([slug, data]) => ({
          slug,
          name: data.name,
          terms: data.terms,
        }));
        this.isLoadingAttributes = false;
        this.initializeSections();
        return;
      }
    }

    const stateAttributes = this.transferState.get(attributesKey, null as any);
    if (stateAttributes) {
      this.attributes = stateAttributes;
      this.isLoadingAttributes = false;
      this.initializeSections();
      return;
    }

    this.isLoadingAttributes = true;
    this.filterService.getAllAttributesAndTermsByCategory(this.categoryId).subscribe({
      next: (attributes) => {
        this.attributes = Object.entries(attributes).map(([slug, data]) => ({
          slug,
          name: data.name,
          terms: data.terms,
        }));
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(attributesKey, this.attributes);
        }
        // نحفظ البيانات في الكاش بنفس الشكل
        this.cacheService.set(`attributes_terms_category_${this.categoryId}_page_1`, { attributes }, 300000);
        this.initializeSections();
      },
      error: (error) => {
        console.error('Error loading initial attributes:', error);
        this.attributes = [];
        this.isLoadingAttributes = false;
      },
      complete: () => {
        this.isLoadingAttributes = false;
      },
    });
  }

  private initializeSections() {
    this.attributes.forEach(attr => {
      this.openSections[attr.slug] = false;
      this.showAll[attr.slug] = false;
    });
  }

  toggleSection(slug: string) {
    this.openSections[slug] = !this.openSections[slug];
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
  }

  private updateAvailableAttributes(selectedAttrSlug: string) {
    if (this.categoryId) {
      this.filterService.getAvailableAttributesAndTerms(this.categoryId, this.selectedFilters).subscribe({
        next: (attributes) => {
          const selectedAttr = this.attributes.find((attr) => attr.slug === selectedAttrSlug);
          this.attributes = Object.entries(attributes).map(([slug, data]) => ({
            slug,
            name: data.name,
            terms: slug === selectedAttrSlug && selectedAttr ? selectedAttr.terms : data.terms,
          }));
        },
        error: (error) => {
          console.error('Error updating attributes:', error);
        },
      });
    }
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) || false;
  }

  // دالة مساعدة للتحقق إذا كان القيمة Observable ولا لأ
  private isObservable(obj: any): obj is Observable<any> {
    return obj && typeof obj.subscribe === 'function';
  }
}