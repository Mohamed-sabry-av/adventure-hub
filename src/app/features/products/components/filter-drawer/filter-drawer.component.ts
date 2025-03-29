import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectionStrategy, ChangeDetectorRef, SimpleChanges, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, FilterSidebarComponent],
  templateUrl: './filter-drawer.component.html',
  styleUrls: ['./filter-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class FilterDrawerComponent implements AfterViewInit {
  @Input() categoryId: number | null = null;
  @Input() brandTermId: number | null = null;
  @Input() isOpen: boolean = false;
  @Input() selectedFilters: { [key: string]: string[] } = {};
  
  @Output() closed = new EventEmitter<void>();
  @Output() filtersChanged = new EventEmitter<{ [key: string]: string[] }>();
  
  @ViewChild('drawer') drawer!: MatDrawer;
  @ViewChild(FilterSidebarComponent) filterSidebar!: FilterSidebarComponent;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    if (this.isOpen) {
      this.drawer.open();
    } else {
      this.drawer.close();
    }
    this.cdr.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.drawer) {
      if (this.isOpen) {
        this.drawer.open();
      } else {
        this.drawer.close();
      }
      this.cdr.detectChanges();
    }
  }

  close() {
    this.drawer.close();
    this.closed.emit();
    this.cdr.detectChanges(); // تحديث فوري عشان الـ backdrop يختفي
  }
  
  onFiltersChange(filters: { [key: string]: string[] }) {
    this.filtersChanged.emit(filters);
  }
  
  applyFilters() {
    if (this.filterSidebar) {
      this.filtersChanged.emit(this.filterSidebar.selectedFilters);
    }
    this.close();
  }
  
  resetFilters() {
    if (this.filterSidebar) {
      this.filterSidebar.resetFilters();
    }
  }
}