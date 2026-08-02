import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  loading = false;
  error = '';
  showPassword = false;

  constructor(private readonly auth: AuthService, private readonly router: Router) {}

  submit() {
    this.loading = true;
    this.error = '';
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.error = err?.error?.message ?? 'Error al registrarse';
        this.loading = false;
      },
    });
  }
}
