/**
 * WebAuthn hook for biometric authentication (Face ID / Touch ID / fingerprint).
 * Stores encrypted credentials after login and uses biometric to unlock them for re-login.
 */

const CREDENTIAL_KEY = "librepass-webauthn-cred";
const SAVED_CREDS_KEY = "librepass-saved-credentials";

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Simple obfuscation for stored credentials (not true encryption, but prevents casual reading)
function obfuscate(text: string): string {
  return btoa(encodeURIComponent(text).split("").reverse().join(""));
}

function deobfuscate(encoded: string): string {
  return decodeURIComponent(atob(encoded).split("").reverse().join(""));
}

export function isWebAuthnSupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function registerBiometric(userId: string, userName: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "LibrePass", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    localStorage.setItem(
      CREDENTIAL_KEY,
      JSON.stringify({
        credentialId: bufferToBase64(credential.rawId),
        userId,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * DEPRECATED: storing passwords in localStorage (even obfuscated) is insecure.
 * Kept as a no-op for backward compatibility. Existing entries are purged.
 * Biometric re-login should rely on Supabase's own persisted refresh token.
 */
export function saveCredentialsForBiometric(_email: string, _password: string): void {
  try { localStorage.removeItem(SAVED_CREDS_KEY); } catch { /* ignore */ }
}

/** No longer supported — always returns null and purges any legacy entry. */
export function getSavedCredentials(): { email: string; password: string } | null {
  try { localStorage.removeItem(SAVED_CREDS_KEY); } catch { /* ignore */ }
  return null;
}

/** Check if there are saved credentials for biometric login */
export function hasSavedCredentials(): boolean {
  return !!localStorage.getItem(SAVED_CREDS_KEY);
}

export async function authenticateWithBiometric(): Promise<{ userId: string } | null> {
  if (!isWebAuthnSupported()) return null;

  const stored = localStorage.getItem(CREDENTIAL_KEY);
  if (!stored) return null;

  try {
    const { credentialId, userId } = JSON.parse(stored);
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: base64ToBuffer(credentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (assertion) return { userId };
    return null;
  } catch {
    return null;
  }
}

export function hasBiometricCredential(): boolean {
  return !!localStorage.getItem(CREDENTIAL_KEY);
}

export function removeBiometricCredential(): void {
  localStorage.removeItem(CREDENTIAL_KEY);
  localStorage.removeItem(SAVED_CREDS_KEY);
  localStorage.removeItem("librepass-faceid");
}
