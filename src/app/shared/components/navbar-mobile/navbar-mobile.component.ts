import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';

import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'app-navbar-mobile',
  imports: [DrawerModule, AsyncPipe],
  templateUrl: './navbar-mobile.component.html',
  styleUrl: './navbar-mobile.component.css',
})
export class NavbarMobileComponent {}
