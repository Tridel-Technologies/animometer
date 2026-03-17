import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../apiService/api-service';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  designation: string;
}

interface Role {
  id: number;
  name: string;
  permissions: any;
}

interface Designation {
  id: number;
  name: string;
}

import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {
  @Input() isDarkMode: boolean = true;

  activeTab: 'users' | 'roles' | 'designations' = 'users';
  isLoading = false;

  users: User[] = [];
  roles: Role[] = [];
  designations: Designation[] = [];
  isAdmin(name: string): boolean {
    if (!name) return false;
    const n = name.toLowerCase();
    return n.includes('admin') || n.includes('administrator');
  }

  showUserModal = false;
  showRoleModal = false;
  showDesignationModal = false;

  isEditing = false;
  currentUser: any = {
    name: '',
    email: '',
    role: '',
    designation: '',
    password: '',
    confirmPassword: ''
  };

  currentRole: any = {
    name: '',
    permissions: {
      dashboard: true,
      reports: false,
      analysis: false,
      users: false,
      settings: false,
      'ship-schedule': false
    }
  };

  currentDesignation: any = {
    name: ''
  };

  toasts: any[] = [];

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData() {
    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      console.log('Fetching user management data...');
      const [users, roles, designations] = await Promise.all([
        this.api.getUsers(),
        this.api.getRoles(),
        this.api.getDesignations()
      ]);
      this.users = users;
      this.roles = roles;
      this.designations = designations;
      console.log('Data loaded successfully:', { usersCount: users.length, rolesCount: roles.length, designationsCount: designations.length });
    } catch (err) {
      console.error('Load error:', err);
      this.addToast('Error', 'Failed to load user management data', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  // --- USER METHODS ---
  openUserModal(user?: User) {
    if (user) {
      this.isEditing = true;
      this.currentUser = { ...user, password: '', confirmPassword: '' };
    } else {
      this.isEditing = false;
      this.currentUser = { name: '', email: '', role: '', designation: '', password: '', confirmPassword: '' };
    }
    this.showUserModal = true;
    this.cdr.markForCheck();
  }

  async saveUser() {
    if (!this.currentUser.name || !this.currentUser.email || !this.currentUser.role || !this.currentUser.designation) {
      this.addToast('Validation', 'All fields are required', 'error');
      return;
    }

    if (!this.isEditing && (!this.currentUser.password || this.currentUser.password !== this.currentUser.confirmPassword)) {
      this.addToast('Validation', 'Passwords must match and be non-empty', 'error');
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      if (this.isEditing) {
        await this.api.updateUser(this.currentUser.id, this.currentUser);
        this.addToast('Success', 'User updated successfully', 'success');
      } else {
        await this.api.createUser(this.currentUser);
        this.addToast('Success', 'User created successfully', 'success');
      }
      this.showUserModal = false;
      await this.loadAllData();
    } catch (err) {
      this.addToast('Error', 'Operation failed', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async deleteUser(id: number) {
    const user = this.users.find(u => u.id === id);
    if (user && this.isAdmin(user.role)) {
      this.addToast('Access Denied', 'Administrator accounts cannot be deleted.', 'error');
      return;
    }

    if (confirm('Permanently delete this user?')) {
      this.isLoading = true;
      this.cdr.markForCheck();
      try {
        await this.api.deleteUser(id);
        this.addToast('Deleted', 'User removed', 'info');
        await this.loadAllData();
      } catch (err) {
        this.addToast('Error', 'Deletion failed', 'error');
      } finally {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    }
  }

  // --- ROLE METHODS ---
  openRoleModal(role?: Role) {
    if (role) {
      this.isEditing = true;
      this.currentRole = {
        ...role,
        permissions: {
          dashboard: true,
          reports: false,
          analysis: false,
          users: false,
          settings: false,
          'ship-schedule': false,
          ...role.permissions
        }
      };
    } else {
      this.isEditing = false;
      this.currentRole = {
        name: '',
        permissions: { dashboard: true, reports: false, analysis: false, users: false, settings: false, 'ship-schedule': false }
      };
    }
    this.showRoleModal = true;
    this.cdr.markForCheck();
  }

  async saveRole() {
    if (!this.currentRole.name) {
      this.addToast('Validation', 'Role name is required', 'error');
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      if (this.isEditing) {
        await this.api.updateRole(this.currentRole.id, this.currentRole);
        this.addToast('Success', 'Role updated', 'success');
      } else {
        await this.api.createRole(this.currentRole);
        this.addToast('Success', 'Role created', 'success');
      }
      this.showRoleModal = false;
      await this.loadAllData();
    } catch (err) {
      this.addToast('Error', 'Failed to save role', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async deleteRole(id: number) {
    const role = this.roles.find(r => r.id === id);
    if (role && this.isAdmin(role.name)) {
      this.addToast('Access Denied', 'The Administrator role cannot be deleted.', 'error');
      return;
    }

    // Check if any user is currently assigned to this role
    const isAssigned = this.users.some(u => u.role === role?.name);
    if (isAssigned) {
      this.addToast('Role In Use', 'Please first remove or alter the role in that user then you can delete the role.', 'error');
      return;
    }

    if (confirm('Delete this role?')) {
      this.isLoading = true;
      this.cdr.markForCheck();
      try {
        await this.api.deleteRole(id);
        this.addToast('Deleted', 'Role removed', 'info');
        await this.loadAllData();
      } catch (err) {
        this.addToast('Error', 'Failed to delete role', 'error');
      } finally {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    }
  }

  // --- DESIGNATION METHODS ---
  openDesignationModal(des?: Designation) {
    if (des) {
      this.isEditing = true;
      this.currentDesignation = { ...des };
    } else {
      this.isEditing = false;
      this.currentDesignation = { name: '' };
    }
    this.showDesignationModal = true;
    this.cdr.markForCheck();
  }

  async saveDesignation() {
    if (!this.currentDesignation.name) {
      this.addToast('Validation', 'Designation name is required', 'error');
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      if (this.isEditing) {
        await this.api.updateDesignation(this.currentDesignation.id, this.currentDesignation);
        this.addToast('Success', 'Designation updated', 'success');
      } else {
        await this.api.createDesignation(this.currentDesignation);
        this.addToast('Success', 'Designation created', 'success');
      }
      this.showDesignationModal = false;
      await this.loadAllData();
    } catch (err) {
      this.addToast('Error', 'Failed to save designation', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  async deleteDesignation(id: number) {
    if (confirm('Delete this designation?')) {
      this.isLoading = true;
      this.cdr.markForCheck();
      try {
        await this.api.deleteDesignation(id);
        this.addToast('Deleted', 'Designation removed', 'info');
        await this.loadAllData();
      } catch (err) {
        this.addToast('Error', 'Failed to delete designation', 'error');
      } finally {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    }
  }

  // --- TOASTS ---
  addToast(title: string, message: string, type: 'success' | 'error' | 'info') {
    const id = Date.now();
    this.toasts.push({ id, title, message, type });
    setTimeout(() => this.removeToast(id), 4000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
