import * as LocalAuthentication from "expo-local-authentication";

/**
 * Returns true if the device has enrolled biometrics (Face ID / fingerprint).
 */
export async function isBiometricAvailable() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Prompts biometric authentication.
 * @returns {boolean} true if authenticated successfully
 */
export async function authenticateWithBiometrics() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Verify it's you",
    fallbackLabel: "Use PIN",
    disableDeviceFallback: false,
    cancelLabel: "Cancel",
  });
  return result.success;
}
