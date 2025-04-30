import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarService {
  sideNavIsVisible$ = new BehaviorSubject<boolean>(false);
  searcBarIsVisible$ = new BehaviorSubject<boolean>(false);

  siwtchSideNav(visible: boolean) {
    this.sideNavIsVisible$.next(visible);
  }

  showSearchBar(isVisible: boolean) {
    this.searcBarIsVisible$.next(isVisible);
  }

  // -------------------- show navbar or no
  navbarIsVisible$ = new BehaviorSubject<boolean>(true);
  showNavbar(isVisible: boolean) {
    this.navbarIsVisible$.next(isVisible);
  }

  // -------------------- header height
  headerHeight$ = new BehaviorSubject<number>(100);
  handleScroll(headerHeight: any) {
    this.headerHeight$.next(headerHeight);
  }
}
