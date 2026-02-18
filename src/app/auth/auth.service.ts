import { computed, Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  GoogleAuthProvider,
  User,
  UserCredential,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  readonly currentUser = toSignal(authState(this.auth), { initialValue: null as User | null });
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  async login(email: string, password: string) {
    await this.checkAllowlist(email);
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(email: string, password: string) {
    await this.checkAllowlist(email);
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async loginWithGoogle() {
    const result = await signInWithPopup(this.auth, new GoogleAuthProvider());
    try {
      await this.checkAllowlist(result.user.email!);
    } catch {
      await signOut(this.auth);
      throw new Error('This email is not authorized to access this application.');
    }
    return result;
  }

  logout() {
    return signOut(this.auth);
  }

  private async checkAllowlist(email: string): Promise<void> {
    const ref = doc(this.firestore, 'allowedUsers', email.toLowerCase());
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('This email is not authorized to access this application.');
    }
  }
}
