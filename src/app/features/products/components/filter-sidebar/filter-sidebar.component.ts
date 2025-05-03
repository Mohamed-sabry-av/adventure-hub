import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  SimpleChanges,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../../../core/services/filter.service';
import { BreadcrumbRoutesComponent } from '../breadcrumb-routes/breadcrumb-routes.component';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, finalize, switchMap } from 'rxjs/operators';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';

interface Term {
  id: number;
  name: string;
}
interface Attribute {
  slug: string;
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
  animations: [
    trigger('expandCollapse', [
      state(
        'collapsed',
        style({ height: '0', overflow: 'hidden', opacity: 0 })
      ),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('200ms ease-out')),
    ]),
  ],
})
export class FilterSidebarComponent implements OnInit, OnChanges {
  @Input() categoryId: number | null = null;
  @Input() selectedFilters: { [key: string]: string[] } = {};
  @Output() filtersChanges = new EventEmitter<{ [key: string]: string[] }>();

  originalAttributes: Attribute[] = [];
  attributes: Attribute[] = [];
  sectionStates: { [slug: string]: SectionState } = {};
  isLoadingAttributes = true;
  errorMessage: string | null = null;
  private readonly DEFAULT_VISIBLE_TERMS = 5;
  private filtersSubject = new BehaviorSubject<{ [key: string]: string[] }>({});


  constructor(
    private filterService: FilterService,
    private cdr: ChangeDetectorRef
  ) {}

 ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryId'] && changes['categoryId'].currentValue !== changes['categoryId'].previousValue) {
      // Reset filters only if categoryId actually changed
      this.selectedFilters = {};
      localStorage.removeItem(`filters_${changes['categoryId'].previousValue}`);
      // Load saved filters for the new categoryId, if any
      const savedFilters = localStorage.getItem(`filters_${this.categoryId}`);
      this.selectedFilters = savedFilters ? JSON.parse(savedFilters) : {};
      this.filtersSubject.next({ ...this.selectedFilters });
      this.loadAttributes();
    } else if (changes['selectedFilters']) {
      this.filtersSubject.next({ ...this.selectedFilters });
      this.updateAvailableAttributes();
    }
  }

  ngOnInit(): void {
    if (
      !this.selectedFilters ||
      Object.keys(this.selectedFilters).length === 0
    ) {
      const savedFilters = localStorage.getItem(`filters_${this.categoryId}`);
      this.selectedFilters = savedFilters ? JSON.parse(savedFilters) : {};
    }
  
    this.filtersSubject.next({ ...this.selectedFilters });
  
    this.filtersSubject
      .pipe(
        debounceTime(100),
        switchMap((filters) =>
          this.filterService
            .getAvailableAttributesAndTerms(this.categoryId!, filters)
            .pipe(
              finalize(() => {
                this.updateUI();
              })
            )
        )
      )
      .subscribe({
        next: (data) => {
          const availableAttributes = Object.entries(data).map(
            ([slug, attr]:any) => ({
              slug,
              name: attr.name,
              terms: attr.terms,
            })
          );
  
          this.attributes = this.originalAttributes.map((originalAttr) => {
            const selectedTerms = this.selectedFilters[originalAttr.slug];
            const availableAttr = availableAttributes.find(
              (attr) => attr.slug === originalAttr.slug
            );
  
            if (selectedTerms && selectedTerms.length > 0) {
              return { ...originalAttr };
            }
            return availableAttr || { ...originalAttr, terms: [] };
          });
  
          this.adjustSectionsAfterUpdate();
          this.filtersChanges.emit({ ...this.selectedFilters });
          this.updateUI();
        },
        error: (error) => {
          this.errorMessage = 'Failed to update filters.';
          this.updateUI();
        },
      });
  
    this.loadAttributes();
  }

  private async loadAttributes(): Promise<void> {
    this.isLoadingAttributes = true;
    this.errorMessage = null;
    this.attributes = [];
    this.updateUI();

    if (!this.categoryId) {
      this.isLoadingAttributes = false;
      this.errorMessage = 'No category selected.';
      this.updateUI();
      return;
    }

    try {
      const data = await this.filterService
        .getAllAttributesAndTermsByCategory(this.categoryId)
        .toPromise();
      if (data && Object.keys(data).length > 0) {
        this.originalAttributes = Object.entries(data).map(([slug, attr]) => ({
          slug,
          name: attr.name,
          terms: attr.terms.sort((a, b) => a.name.localeCompare(b.name)),
        }));
        this.attributes = [...this.originalAttributes];
        this.initializeSections();
      } else {
        this.errorMessage = 'No attributes available.';
        console.warn('No data received from filter service.');
      }
    } catch (error) {
      this.errorMessage = 'Failed to load filters.';
      console.error('Error loading attributes:', error);
    } finally {
      this.isLoadingAttributes = false;
      this.updateUI();
    }
  }

  private initializeSections(): void {
    this.attributes.forEach((attr) => {
      this.sectionStates[attr.slug] = {
        isOpen: true,
        showAll: false,
        visibleTermsCount: this.DEFAULT_VISIBLE_TERMS,
        animationState: 'expanded',
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
      ? this.getAttributeBySlug(slug)!.terms.length
      : this.DEFAULT_VISIBLE_TERMS;
    this.updateUI();
  }

  onFilterChange(attrSlug: string, termId: number): void {
    const termIdStr = termId.toString();
    if (!this.selectedFilters[attrSlug]) this.selectedFilters[attrSlug] = [];

    const index = this.selectedFilters[attrSlug].indexOf(termIdStr);
    if (index > -1) {
      this.selectedFilters[attrSlug].splice(index, 1);
      if (this.selectedFilters[attrSlug].length === 0)
        delete this.selectedFilters[attrSlug];
    } else {
      this.selectedFilters[attrSlug].push(termIdStr);
    }

    localStorage.setItem(
      `filters_${this.categoryId}`,
      JSON.stringify(this.selectedFilters)
    );

    this.filtersSubject.next({ ...this.selectedFilters });
    this.updateUI();
  }

  private updateAvailableAttributes(): void {
    if (!this.categoryId) return;

    this.filterService
      .getAvailableAttributesAndTerms(this.categoryId, this.selectedFilters)
      .subscribe({
        next: (data) => {
          const availableAttributes = Object.entries(data).map(
            ([slug, attr]) => ({
              slug,
              name: attr.name,
              terms: attr.terms,
            })
          );

          // Merge original attributes with available ones
          this.attributes = this.originalAttributes.map((originalAttr) => {
            const selectedTerms = this.selectedFilters[originalAttr.slug];
            const availableAttr = availableAttributes.find(
              (attr) => attr.slug === originalAttr.slug
            );

            // If there are selected terms for this attribute, return all original terms
            if (selectedTerms && selectedTerms.length > 0) {
              return { ...originalAttr };
            }
            // Otherwise, return only available terms
            return availableAttr || { ...originalAttr, terms: [] };
          });

          this.adjustSectionsAfterUpdate();
          this.updateUI();
        },
        error: (error) => {
          console.error('Error updating attributes:', error);
          this.errorMessage = 'Failed to update filters.';
          this.updateUI();
        },
      });
  }
  private adjustSectionsAfterUpdate(): void {
    const newSectionStates: { [slug: string]: SectionState } = {};
    this.attributes.forEach((attr) => {
      const existingState = this.sectionStates[attr.slug] || {
        isOpen: false,
        showAll: false,
        visibleTermsCount: this.DEFAULT_VISIBLE_TERMS,
        animationState: 'collapsed',
      };
      newSectionStates[attr.slug] = {
        ...existingState,
        isOpen:
          existingState.isOpen || !!this.selectedFilters[attr.slug]?.length,
        animationState:
          existingState.isOpen || !!this.selectedFilters[attr.slug]?.length
            ? 'expanded'
            : 'collapsed',
      };
    });
    this.sectionStates = newSectionStates;
  }

  isSelected(attrSlug: string, termId: number): boolean {
    return this.selectedFilters[attrSlug]?.includes(termId.toString()) ?? false;
  }

  getVisibleTerms(attribute: Attribute): Term[] {
    const state = this.sectionStates[attribute.slug];
    const sortedTerms = [...attribute.terms].sort((a, b) => {
      const aSelected = this.isSelected(attribute.slug, a.id);
      const bSelected = this.isSelected(attribute.slug, b.id);
      return aSelected === bSelected ? 0 : aSelected ? -1 : 1;
    });

    // نرجع العناصر المرئية بناءً على showAll أو DEFAULT_VISIBLE_TERMS
    return sortedTerms.slice(
      0,
      state?.showAll ? sortedTerms.length : this.DEFAULT_VISIBLE_TERMS
    );
  }

  hasMoreTerms(attribute: Attribute): boolean {
    return attribute.terms.length > this.DEFAULT_VISIBLE_TERMS;
  }

  getShowMoreText(attribute: Attribute): string {
    const state = this.sectionStates[attribute.slug];
    return state?.showAll
      ? 'Show Less'
      : `Show All (${attribute.terms.length})`;
  }

  getAttributeBySlug(slug: string): Attribute | undefined {
    return this.attributes.find((attr) => attr.slug === slug);
  }

  resetFilters(): void {
    this.selectedFilters = {};
    localStorage.removeItem(`filters_${this.categoryId}`);
    this.filtersSubject.next({});
    this.loadAttributes();
  }

  get hasSelectedFilters(): boolean {
    return Object.keys(this.selectedFilters).length > 0;
  }

  trackByAttr(_: number, attr: Attribute): string {
    return attr.slug;
  }

  trackByTerm(_: number, term: Term): number {
    return term.id;
  }

  private updateUI(): void {
    this.cdr.markForCheck();
  }
}
