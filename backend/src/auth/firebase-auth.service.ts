import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAuthService {
  private readonly auth: Auth;
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    const projectId = config.get<string>('FIREBASE_PROJECT_ID', 'midterm-fe002');
    // Use the backend Firebase web API key for the Identity Toolkit REST
    // fallback when Admin SDK credentials are not set.
    this.apiKey = config.get<string>('FIREBASE_API_KEY') || config.get<string>('VITE_FIREBASE_API_KEY');
    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    const app = getApps()[0] || initializeApp(
      clientEmail && privateKey
        ? { credential: cert({ projectId, clientEmail, privateKey }), projectId }
        : { projectId },
    );
    this.auth = getAuth(app);
  }

  verifyIdToken(idToken: string) {
    return this.auth.verifyIdToken(idToken).catch(async (adminError) => {
      if (!this.apiKey) throw adminError;
      return this.verifyWithFirebaseRestApi(idToken);
    });
  }

  private async verifyWithFirebaseRestApi(idToken: string) {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(this.apiKey!)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const result: any = await response.json().catch(() => ({}));
    const account = result.users?.[0];
    if (!response.ok || !account?.localId) {
      throw new Error(result.error?.message || 'Firebase ID token verification failed');
    }
    return {
      uid: account.localId,
      email: account.email,
      email_verified: account.emailVerified,
      name: account.displayName,
      picture: account.photoUrl,
      firebase: { sign_in_provider: account.providerUserInfo?.[0]?.providerId || 'unknown' },
    };
  }
}
