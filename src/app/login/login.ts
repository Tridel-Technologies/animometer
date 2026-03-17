import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../apiService/api-service';
import { MessageService } from 'primeng/api';

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
  showPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  currentYear = new Date().getFullYear();


  constructor(
    private router: Router,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private zone: NgZone
  ) { }

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    this.resetError = '';
    this.loginError = '';
    this.emailVerified = false;

    // Clear all fields on flip
    this.email = '';
    this.password = '';
    this.forgotEmail = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  isStrongPassword(password: string): boolean {
    if (!password) return false;
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(password);
  }

  async onLogin(event: Event) {
    event.preventDefault();
    this.loginError = '';
    
    if (!this.email || !this.password) {
      this.loginError = 'Please enter both email and password';
      this.messageService.add({ severity: 'error', summary: 'Error', detail: this.loginError });
      return;
    }

    if (!this.isStrongPassword(this.password)) {
      this.loginError = 'Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.';
      this.messageService.add({ severity: 'error', summary: 'Validation', detail: this.loginError });
      return;
    }

    this.isLoading = true;
    try {
      const res = await this.apiService.login({ email: this.email, password: this.password });
      
      this.zone.run(() => {
        localStorage.setItem('station_user', JSON.stringify(res.user));
        localStorage.setItem('station_token', res.token);
        this.router.navigate(['/base/dashboard']);
      });
    } catch (error: any) {
      this.zone.run(() => {
        const errorMsg = error.error?.error || 'Login failed. Please check your credentials.';
        this.loginError = errorMsg;
        this.messageService.add({
          severity: 'error',
          summary: 'Login Failed',
          detail: errorMsg,
          life: 3000
        });
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async verifyEmail() {
    this.resetError = '';
    this.isLoading = true;
    this.cdr.detectChanges(); // Start loading immediately

    try {
      const res = await this.apiService.checkEmail(this.forgotEmail);
      this.zone.run(() => {
        if (res.exists) {
          this.emailVerified = true;
        } else {
          this.resetError = 'Email not found in our records.';
        }
        this.isLoading = false;
        this.cdr.detectChanges(); // Force UI to show new password fields
      });
    } catch (error: any) {
      this.zone.run(() => {
        this.resetError = error.error?.error || 'Email verification failed.';
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async onResetPassword() {
    this.resetError = '';

    if (!this.isStrongPassword(this.newPassword)) {
      this.resetError = 'New password must be at least 8 characters long and include an uppercase letter, a number, and a special character.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.resetError = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    try {
      await this.apiService.resetPassword({ email: this.forgotEmail, password: this.newPassword });
      this.zone.run(() => {
        alert('Password updated successfully. You can now login.');
        this.toggleFlip();
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    } catch (error: any) {
      this.zone.run(() => {
        this.resetError = error.error?.error || 'Failed to reset password.';
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    }
  }
}
