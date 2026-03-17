import { Component, signal } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
}
