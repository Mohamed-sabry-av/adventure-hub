import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarService {
  navBarIsVisible = signal<boolean>(true);
  showNavbar(navbarVisible: boolean) {
    this.navBarIsVisible.update((prev) => navbarVisible);
  }

  headerHeight = signal<number>(92);
  setHeaderHeight(headerHeight: any) {
    this.headerHeight.set(headerHeight);
  }

  showSearchBar = signal<boolean>(false);
  toggleSearchBar(isVisible: boolean) {
    this.showSearchBar.set(isVisible);
  }

  sideNavIsVisible = signal<boolean>(false);
  toggleSideNav(visible: boolean) {
    this.sideNavIsVisible.update((prev) => visible);
  }
}
