import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface CurrentUser {
  name: string;
  role: string;
  email: string;
  vessel: string;
  lastLogin: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  @Input() currentUser: any = {};

  constructor(private router: Router) { }

  logout() {
    localStorage.removeItem('station_user');
    localStorage.removeItem('station_token');
    this.router.navigate(['/login']);
  }
}
