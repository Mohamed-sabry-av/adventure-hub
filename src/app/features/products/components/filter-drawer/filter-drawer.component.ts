import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterSidebarComponent } from '../filter-sidebar/filter-sidebar.component';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, FilterSidebarComponent],
  templateUrl: './filter-drawer.component.html',
  styleUrls: ['./filter-drawer.component.css'],
})
export class FilterDrawerComponent {
  @Input() categoryId: number | null = null;
  @Input() isOpen: boolean = false; // للتحكم في فتح/غلق الـ drawer من الـ parent
  @Output() closed = new EventEmitter<void>(); // لإبلاغ الـ parent بالإغلاق
  @ViewChild('drawer') drawer!: MatDrawer;

  open() {
    this.drawer.open();
  }

  close() {
    this.drawer.close();
    this.closed.emit();
  }
}