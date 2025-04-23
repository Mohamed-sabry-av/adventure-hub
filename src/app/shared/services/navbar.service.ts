import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarService {
  sideNavIsVisible$ = new BehaviorSubject<boolean>(false);
  searcBarIsVisible$ = new BehaviorSubject<boolean>(false);
  navbarIsVisible$ = new BehaviorSubject<boolean>(true);
  headerHeight$ = new BehaviorSubject<number>(88);

  siwtchSideNav(visible: boolean) {
    this.sideNavIsVisible$.next(visible);
  }

  handleScroll(headerHeight: any) {
    this.headerHeight$.next(headerHeight);
  }

  showSearchBar(isVisible: boolean) {
    this.searcBarIsVisible$.next(isVisible);
  }

  showNavbar(isVisible: boolean) {
    this.navbarIsVisible$.next(isVisible);
  }
}
