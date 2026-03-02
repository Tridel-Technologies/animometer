import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Input() currentUser: CurrentUser = {
    name: '',
    role: '',
    email: '',
    vessel: '',
    lastLogin: ''
  };
}
