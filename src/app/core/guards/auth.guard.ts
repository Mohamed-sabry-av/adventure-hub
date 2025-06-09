import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AccountAuthService } from '../../features/auth/account-auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private accountService: AccountAuthService,
    private router: Router
  ) {}
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    return this.accountService.verifyToken().pipe(
      map(() => true),
      catchError(() => {
        this.router.navigate(['/user/myaccount']);
        return of(false);
      })
    );
  }
}
