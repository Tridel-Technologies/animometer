import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Layout } from './layout/layout';

export const routes: Routes = [
  { path: '', redirectTo: 'base/home', pathMatch: 'full' },
  {
    path: 'base',
    component: Layout,
    children: [
      { path: 'home', component: Home }
    ]
  }
];

