import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarService {
  sideNavIsVisible$ = new BehaviorSubject<boolean>(false);

  siwtchSideNav(visible: boolean) {
    this.sideNavIsVisible$.next(visible);
  }
}
