import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../../../core/services/filter.service';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { ProductsBrandService } from '../../services/products-brand.service';
import { Observable, finalize } from 'rxjs';
import { trigger, transition, style, animate, state } from '@angular/animations';

interface Attribute {
  slug: string;
  name: string;
  terms: { id: number; name: string }[];
}

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbRoutesComponent],
  templateUrl: './filter-sidebar.component.html',
  styleUrls: ['./filter-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({
        height: '0',
        overflow: 'hidden',
        opacity: 0,
        margin: '0',
        padding: '0'
      })),
      state('expanded', style({
        height: '*',
        opacity: 1
      })),
      transition('collapsed <=> expanded', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ])
    ]),
    trigger('fadeSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ]),
    trigger('pulse', [
      transition('* => *', [
        style({ transform: 'scale(1)' }),
        animate('300ms ease-in-out', style({ transform: 'scale(1.05)' })),
        animate('200ms ease-in-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class FilterSidebarComponent implements OnInit {
  @Input() categoryId: number | null = null;
  @Input() brandTermId: number | null = null;
  @Input() selectedFilters: { [key: string]: string[] } = {};
  @Output() filtersChanges = new EventEmitter<{ [key: string]: string[] }>();

  attributes: Attribute[] = [];
  openSections: { [key: string]: boolean } = {};
  showAll: { [key: string]: boolean } = {};
  isLoadingAttributes = true;
  visibleTermsCount: { [key: string]: number } = {};
  animationState: { [key: string]: string } = {};
  isUpdatingFilters = false;

  private readonly DEFAULT_VISIBLE_TERMS = 5;

  constructor(
    private filterService: FilterService,
    private productsByBrandService: ProductsBrandService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initializeConfig();
    this.loadAttributes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      (changes['categoryId'] && !changes['categoryId'].firstChange) ||
      (changes['brandTermId'] && !changes['brandTermId'].firstChange)
    ) {
      this.resetState();
      this.loadAttributes();
    }

    if (changes['selectedFilters'] && !changes['selectedFilters'].firstChange) {
      this.updateFilterState();
    }
  }

  private initializeConfig(): void {
    this.visibleTermsCount = {};
    this.animationState = {};
  }

  private resetState(): void {
    this.selectedFilters = {};
    this.openSections = {};
    this.showAll = {};
    this.visibleTermsCount = {};
    this.isLoadingAttributes = true;
    this.attributes = [];
  }

  private updateFilterState(): void {
    if (this.isUpdatingFilters) {
      this.isUpdatingFilters = false;
      return;
    }

    if (Object.keys(this.selectedFilters).length > 0) {
      for (const slug of Object.keys(this.selectedFilters)) {
        this.openSections[slug] = true;
        this.animationState[slug] = 'expanded';
      }
    }

    this.cdr.markForCheck();
  }

  private loadAttributes(): void {
    this.isLoadingAttributes = true;
    this.cdr.markForCheck();

    const id = this.categoryId !== null && this.categoryId !== undefined ? this.categoryId : this.brandTermId;
    const type = this.categoryId !== null && this.categoryId !== undefined ? 'category' : 'brand';

    if (id === null || id === undefined) {
      this.handleEmptyAttributes();
      return;
    }

    let observable: Observable<any>;
    if (type === 'category') {
      observable = this.filterService.getAllAttributesAndTermsByCategory(id);
    } else {
      observable = this.productsByBrandService.getAllAttributesAndTermsByBrand(id); // افتراض أن الدالة موجودة
    }

    observable.pipe(
      finalize(() => {
        this.isLoadingAttributes = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (data) => {
        this.attributes = this.processAttributesData(data, type);
        this.initializeSections();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error(`Error fetching attributes for ${type}:`, error);
        this.attributes = [];
        this.isLoadingAttributes = false;
        this.cdr.markForCheck();
      }
    });
  }

  private handleEmptyAttributes(): void {
    this.attributes = [];
    this.isLoadingAttributes = false;
    this.cdr.markForCheck();
  }

  private processAttributesData(data: any, type: 'category' | 'brand'): Attribute[] {
    const attributes = type === 'category' ? data : data; // لو الـ brand بيرجع نفس الهيكلة
    return attributes
      ? Object.entries(attributes)
          .map(([slug, attrData]: [string, any]) => ({
            slug,
            name: attrData.name,
            terms: attrData.terms,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }

  private initializeSections() {
    this.attributes.forEach((attr) => {
      if (this.openSections[attr.slug] === undefined) {
        this.openSections[attr.slug] = !!this.selectedFilters[attr.slug]?.length;
        this.animationState[attr.slug] = this.openSections[attr.slug] ? 'expanded' : 'collapsed';
      }

      if (this.showAll[attr.slug] === undefined) {
        this.showAll[attr.slug] = false;
      }

      if (this.visibleTermsCount[attr.slug] === undefined) {
        this.visibleTermsCount[attr.slug] = this.DEFAULT_VISIBLE_TERMS;
      }
    });

    this.cdr.markForCheck();
  }

  toggleSection(slug: string): void {
    this.openSections[slug] = !this.openSections[slug];
    this.animationState[slug] = this.openSections[slug] ? 'expanded' : 'collapsed';
    this.cdr.markForCheck();
  }

  toggleShowAll(slug: string, event: Event): void {
    event.stopPropagation();
    this.showAll[slug] = !this.showAll[slug];
    this.visibleTermsCount[slug] = this.showAll[slug]
      ? this.getAttributeBySlug(slug)?.terms.length || this.DEFAULT_VISIBLE_TERMS
      : this.DEFAULT_VISIBLE_TERMS;
    this.cdr.markForCheck();
  }

  onFilterChange(attrSlug: string, termId: number): void {
    this.isUpdatingFilters = true;

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
      error: (error) => console.error('Error updating attributess:', error),
    });
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) || false;
  }

  getVisibleTerms(attribute: Attribute): { id: number; name: string }[] {
    const max = this.showAll[attribute.slug]
      ? attribute.terms.length
      : (this.visibleTermsCount[attribute.slug] || this.DEFAULT_VISIBLE_TERMS);

    return attribute.terms.slice(0, max);
  }

  hasMoreTerms(attribute: Attribute): boolean {
    return attribute.terms.length > (this.visibleTermsCount[attribute.slug] || this.DEFAULT_VISIBLE_TERMS);
  }

  getShowMoreText(attribute: Attribute): string {
    return this.showAll[attribute.slug]
      ? `Show Less`
      : `Show All (${attribute.terms.length})`;
  }

  getAttributeBySlug(slug: string): Attribute | undefined {
    return this.attributes.find(attr => attr.slug === slug);
  }

  resetFilters(): void {
    this.selectedFilters = {};
    this.filtersChanges.emit({});
    this.loadAttributes();
    this.cdr.markForCheck();
  }
  get hasSelectedFilters(): boolean {
    return Object.keys(this.selectedFilters).length > 0;
  }
}