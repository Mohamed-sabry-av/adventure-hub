import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../../../core/services/filter.service';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { ProductsBrandService } from '../../services/products-brand.service';
import { Observable, finalize, debounceTime, BehaviorSubject } from 'rxjs';
import { trigger, transition, style, animate, state } from '@angular/animations';

interface Term {
  id: number;
  name: string;
}

interface Attribute {
  slug: string;
  name: string;
  terms: Term[];
}

interface AttributeData {
  name: string;
  terms: Term[];
}

interface SectionState {
  isOpen: boolean;
  showAll: boolean;
  visibleTermsCount: number;
  animationState: 'expanded' | 'collapsed';
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
      state('collapsed', style({ height: '0', overflow: 'hidden', opacity: 0, margin: '0', padding: '0' })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
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
  sectionStates: { [slug: string]: SectionState } = {};
  isLoadingAttributes = true;
  errorMessage: string | null = null;
  private readonly DEFAULT_VISIBLE_TERMS = 5;

  private filtersSubject = new BehaviorSubject<{ [key: string]: string[] }>({});

  constructor(
    private filterService: FilterService,
    private productsByBrandService: ProductsBrandService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadAttributes();
    this.filtersSubject.subscribe(filters => this.filtersChanges.emit({ ...filters }));
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

  private resetState(): void {
    this.selectedFilters = {};
    this.sectionStates = {};
    this.isLoadingAttributes = true;
    this.attributes = [];
    this.errorMessage = null;
    this.updateUI();
  }

  private updateFilterState(): void {
    if (Object.keys(this.selectedFilters).length > 0) {
      Object.keys(this.selectedFilters).forEach(slug => {
        this.sectionStates[slug] = {
          ...this.sectionStates[slug],
          isOpen: true,
          animationState: 'expanded'
        };
      });
    }
    this.updateUI();
  }

  private loadAttributes(): void {
    this.isLoadingAttributes = true;
    this.errorMessage = null;
    this.updateUI();

    const id = this.categoryId ?? this.brandTermId;
    const type = this.categoryId !== null ? 'category' : 'brand';

    if (id === null || id === undefined) {
      this.handleEmptyAttributes();
      return;
    }

    const observable: Observable<Record<string, AttributeData>> = type === 'category'
      ? this.filterService.getAllAttributesAndTermsByCategory(id)
      : this.productsByBrandService.getAllAttributesAndTermsByBrand(id);

    observable.pipe(
      finalize(() => {
        this.isLoadingAttributes = false;
        this.updateUI();
      })
    ).subscribe({
      next: (data) => {
        this.attributes = this.processAttributesData(data, type);
        this.initializeSections();
        this.updateUI();
      },
      error: (error) => {
        console.error(`Error fetching attributes for ${type}:`, error);
        this.attributes = [];
        this.errorMessage = 'Failed to load filters. Please try again later.';
        this.updateUI();
      }
    });
  }

  private handleEmptyAttributes(): void {
    this.attributes = [];
    this.isLoadingAttributes = false;
    this.errorMessage = 'No category or brand selected.';
    this.updateUI();
  }

  private processAttributesData(data: Record<string, AttributeData>, type: 'category' | 'brand'): Attribute[] {
    return data
      ? Object.entries(data)
          .map(([slug, attrData]) => ({
            slug,
            name: attrData.name,
            terms: attrData.terms,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }

  private initializeSections(): void {
    this.attributes.forEach(attr => {
      this.sectionStates[attr.slug] = {
        isOpen: !!this.selectedFilters[attr.slug]?.length,
        showAll: false,
        visibleTermsCount: this.DEFAULT_VISIBLE_TERMS,
        animationState: this.selectedFilters[attr.slug]?.length ? 'expanded' : 'collapsed'
      };
    });
  }

  toggleSection(slug: string): void {
    const state = this.sectionStates[slug];
    state.isOpen = !state.isOpen;
    state.animationState = state.isOpen ? 'expanded' : 'collapsed';
    this.updateUI();
  }

  toggleShowAll(slug: string, event: Event): void {
    event.stopPropagation();
    const state = this.sectionStates[slug];
    state.showAll = !state.showAll;
    state.visibleTermsCount = state.showAll
      ? this.getAttributeBySlug(slug)?.terms.length ?? this.DEFAULT_VISIBLE_TERMS
      : this.DEFAULT_VISIBLE_TERMS;
    this.updateUI();
  }

  onFilterChange(attrSlug: string, termId: number): void {
    const termIdStr = termId.toString();
    const currentFilters = { ...this.selectedFilters };

    if (!currentFilters[attrSlug]) {
      currentFilters[attrSlug] = [];
    }

    if (currentFilters[attrSlug].includes(termIdStr)) {
      currentFilters[attrSlug] = currentFilters[attrSlug].filter(id => id !== termIdStr);
    } else {
      currentFilters[attrSlug].push(termIdStr);
    }

    if (currentFilters[attrSlug].length === 0) {
      delete currentFilters[attrSlug];
    }

    this.selectedFilters = currentFilters;
    this.filtersSubject.next(currentFilters);
    this.updateAvailableAttributes(); // استدعاء بدون selectedAttrSlug
    this.updateUI();
  }

  private updateAvailableAttributes(): void {
    const id = this.categoryId ?? this.brandTermId;
    const type = this.categoryId !== null ? 'category' : 'brand';

    if (!id) return;

    const observable = type === 'category'
      ? this.filterService.getAvailableAttributesAndTerms(id, this.selectedFilters)
      : this.productsByBrandService.getAvailableAttributesAndTermsByBrand(id, this.selectedFilters);

    observable.pipe(debounceTime(300)).subscribe({
      next: (attributesData: Record<string, AttributeData>) => {
        this.attributes = this.processAttributesData(attributesData, type); 
        this.adjustSectionsAfterUpdate();
        this.updateUI();
      },
      error: (error) => {
        console.error('Error updating attributes:', error);
        this.errorMessage = 'Failed to update available filters.';
        this.updateUI();
      }
    });
  }

  private adjustSectionsAfterUpdate(): void {
    const newSectionStates: { [slug: string]: SectionState } = {};
    this.attributes.forEach(attr => {
      const existingState = this.sectionStates[attr.slug] || {
        isOpen: false,
        showAll: false,
        visibleTermsCount: this.DEFAULT_VISIBLE_TERMS,
        animationState: 'collapsed'
      };
      newSectionStates[attr.slug] = {
        ...existingState,
        isOpen: existingState.isOpen || !!this.selectedFilters[attr.slug]?.length,
        animationState: (existingState.isOpen || !!this.selectedFilters[attr.slug]?.length) ? 'expanded' : 'collapsed'
      };
    });
    this.sectionStates = newSectionStates;
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) ?? false;
  }

  getVisibleTerms(attribute: Attribute): Term[] {
    const state = this.sectionStates[attribute.slug];
    const max = state?.showAll ? attribute.terms.length : (state?.visibleTermsCount ?? this.DEFAULT_VISIBLE_TERMS);
    return attribute.terms.slice(0, max);
  }

  hasMoreTerms(attribute: Attribute): boolean {
    const state = this.sectionStates[attribute.slug];
    return attribute.terms.length > (state?.visibleTermsCount ?? this.DEFAULT_VISIBLE_TERMS);
  }

  getShowMoreText(attribute: Attribute): string {
    const state = this.sectionStates[attribute.slug];
    return state?.showAll ? 'Show Less' : `Show All (${attribute.terms.length})`;
  }

  getAttributeBySlug(slug: string): Attribute | undefined {
    return this.attributes.find(attr => attr.slug === slug);
  }

  resetFilters(): void {
    this.selectedFilters = {};
    this.filtersSubject.next({});
    this.loadAttributes();
  }

  get hasSelectedFilters(): boolean {
    return Object.keys(this.selectedFilters).length > 0;
  }

  trackByAttr(index: number, attr: Attribute): string {
    return attr.slug;
  }

  trackByTerm(index: number, term: Term): number {
    return term.id;
  }

  private updateUI(): void {
    this.cdr.markForCheck();
  }
}