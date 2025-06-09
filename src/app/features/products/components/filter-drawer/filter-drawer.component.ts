import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { SidebarModule } from 'primeng/sidebar';
interface SortOption {
  id: string;
  label: string;
}
@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarModule, FilterSidebarComponent],
  templateUrl: './filter-drawer.component.html',
  styleUrls: ['./filter-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterDrawerComponent implements OnChanges {
  @Input() categoryId: number | null = null;
  @Input() isOpen: boolean = false;
  @Input() selectedFilters: { [key: string]: string[] } = {};
  @Input() attributes: { [key: string]: { name: string; terms: { id: number; name: string }[] } } = {};
  @Output() closed = new EventEmitter<void>();
  @Output() filtersChanged = new EventEmitter<{ [key: string]: string[] }>();
  @Output() sortChange = new EventEmitter<string>();
  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;
  selectedSortOption: string = 'newest'; // Default to match desktop default
  sortOptions: SortOption[] = [
    { id: 'popular', label: 'Most Popular' },
    { id: 'rating', label: 'Top Rated' },
    { id: 'newest', label: 'Newest First' },
    { id: 'price-asc', label: 'Price: Low-High' },
    { id: 'price-desc', label: 'Price: High-Low' }
  ];
  constructor(private cdr: ChangeDetectorRef) {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['attributes'] && this.filterSidebar) {
      // Pass attributes to the filter sidebar if passed externally
      setTimeout(() => {
        this.cdr.detectChanges();
      });
    }
  }
  close() {
    this.closed.emit();
    this.cdr.detectChanges();
  }
  applyFilters() {
    if (this.filterSidebar) {

      this.filtersChanged.emit(this.filterSidebar.selectedFilters);
      this.sortChange.emit(this.selectedSortOption);
    }
    this.close();
  }
  resetFilters() {
    if (this.filterSidebar) {
      this.filterSidebar.resetFilters();
      this.selectedSortOption = 'newest';
      this.cdr.detectChanges();
    }
  }
  onSortOptionChange(option: string) {
    this.selectedSortOption = option;
    this.cdr.detectChanges();
  }
  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}

