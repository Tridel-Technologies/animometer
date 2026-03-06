import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Layout } from './layout/layout';
import { Login } from './login/login';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'base',
    component: Layout,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: Home },
      { path: 'report', component: Home },
      { path: 'analysis', component: Home },
      { path: 'users', component: Home, canActivate: [AuthGuard] },
      { path: 'settings', component: Home },
      { path: 'profile', component: Home },
      { path: 'home', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

