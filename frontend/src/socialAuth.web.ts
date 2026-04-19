// Web stub — Google/Apple native sign-in not supported on web.
export function configureGoogleSignIn(): void {}
export async function isAppleAuthAvailable(): Promise<boolean> { return false; }
export async function signInWithGoogle(): Promise<{ token: string; user: any } | null> { return null; }
export async function signInWithApple(): Promise<{ token: string; user: any } | null> { return null; }
