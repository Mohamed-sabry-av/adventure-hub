import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MaintenanceService } from '../services/maintenance.service';

export const maintenanceGuard: CanActivateFn = (route, state) => {
  const maintenanceService = inject(MaintenanceService);
  const router = inject(Router);

  if (maintenanceService.isMaintenance && state.url !== '/maintenance') {
    // Redirect to maintenance page if site is in maintenance mode
    // and not already on the maintenance page
    router.navigate(['/maintenance']);
    return false;
  }

  return true;
}; 