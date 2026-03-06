import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const userJson = localStorage.getItem('station_user');
    const token = localStorage.getItem('station_token');
    
    if (userJson && token) {
      const user = JSON.parse(userJson);
      
      // Check for specific route permissions if needed
      // Most routes are under 'base'
      const path = route.routeConfig?.path;
      if (user.role !== 'Administrator' && path === 'users') {
        this.router.navigate(['/base/dashboard']);
        return false;
      }

      return true;
    }

    // Not logged in
    this.router.navigate(['/login']);
    return false;
  }
}
