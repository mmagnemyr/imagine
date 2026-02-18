import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly isRegistering = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(false);

  async onSubmit() {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.getRawValue();
    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      if (this.isRegistering()) {
        await this.authService.register(email, password);
      } else {
        await this.authService.login(email, password);
      }
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onGoogleSignIn() {
    this.errorMessage.set('');
    this.isLoading.set(true);

    try {
      await this.authService.loginWithGoogle();
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      this.errorMessage.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleMode() {
    this.isRegistering.update(v => !v);
    this.errorMessage.set('');
  }
}
