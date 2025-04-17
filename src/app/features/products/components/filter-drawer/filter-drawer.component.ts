import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { SidebarModule } from 'primeng/sidebar';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarModule, FilterSidebarComponent],
  templateUrl: './filter-drawer.component.html',
  styleUrls: ['./filter-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterDrawerComponent {
  @Input() categoryId: number | null = null;
  @Input() isOpen: boolean = false;
  @Input() selectedFilters: { [key: string]: string[] } = {};

  @Output() closed = new EventEmitter<void>();
  @Output() filtersChanged = new EventEmitter<{ [key: string]: string[] }>();
  @Output() sortChange = new EventEmitter<string>();

  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;

  selectedSortOption: string = 'newest'; // Default to match desktop default

  constructor(private cdr: ChangeDetectorRef) {}

  close() {
    this.closed.emit();
    this.cdr.detectChanges();
  }

  applyFilters() {
    if (this.filterSidebar) {
      console.log('Applying filters:', this.filterSidebar.selectedFilters, 'sort:', this.selectedSortOption);
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