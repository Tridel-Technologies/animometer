import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../apiService/api-service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  // Login fields
  email = '';
  password = '';
  loginError = '';
  
  // Forgot Password fields
  forgotEmail = '';
  newPassword = '';
  confirmPassword = '';
  resetError = '';
  emailVerified = false;
  
  // States
  isLoading = false;
  isFlipped = false;

  constructor(private router: Router, private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    this.resetError = '';
    this.loginError = '';
    this.emailVerified = false;
  }

  async onLogin(event: Event) {
    event.preventDefault();
    this.loginError = '';
    
    if (!this.email || !this.password) {
      this.loginError = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    try {
      const res = await this.apiService.login({ email: this.email, password: this.password });
      
      // Save full user object including permissions and token
      localStorage.setItem('station_user', JSON.stringify(res.user));
      localStorage.setItem('station_token', res.token);
      
      this.router.navigate(['/base/dashboard']);
    } catch (error: any) {
      this.loginError = error.error?.error || 'Login failed. Please check your credentials.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async verifyEmail() {
    this.resetError = '';
    this.isLoading = true;
    try {
      const res = await this.apiService.checkEmail(this.forgotEmail);
      if (res.exists) {
        this.emailVerified = true;
      }
    } catch (error: any) {
      this.resetError = error.error?.error || 'Email verification failed.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async onResetPassword() {
    this.resetError = '';
    if (this.newPassword !== this.confirmPassword) {
      this.resetError = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    try {
      await this.apiService.resetPassword({ email: this.forgotEmail, password: this.newPassword });
      alert('Password updated successfully. You can now login.');
      this.toggleFlip(); // Flip back to login
    } catch (error: any) {
      this.resetError = error.error?.error || 'Failed to reset password.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
