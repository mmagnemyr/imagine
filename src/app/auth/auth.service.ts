import { computed, Injectable, inject, signal } from '@angular/core';
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

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  readonly currentUser = toSignal(authState(this.auth), { initialValue: null as User | null });
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly googleAccessToken = signal<string | null>(null);

  async login(email: string, password: string) {
    await this.checkAllowlist(email);
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(email: string, password: string) {
    await this.checkAllowlist(email);
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    for (const scope of YOUTUBE_SCOPES) {
      provider.addScope(scope);
    }

    const result = await signInWithPopup(this.auth, provider);

    const credential = GoogleAuthProvider.credentialFromResult(result);
    this.googleAccessToken.set(credential?.accessToken ?? null);

    try {
      await this.checkAllowlist(result.user.email!);
    } catch {
      await signOut(this.auth);
      this.googleAccessToken.set(null);
      throw new Error('This email is not authorized to access this application.');
    }
    return result;
  }

  async refreshGoogleToken(): Promise<string> {
    const provider = new GoogleAuthProvider();
    for (const scope of YOUTUBE_SCOPES) {
      provider.addScope(scope);
    }

    const result = await signInWithPopup(this.auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    this.googleAccessToken.set(token);

    if (!token) {
      throw new Error('Failed to refresh Google access token.');
    }
    return token;
  }

  logout() {
    this.googleAccessToken.set(null);
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
