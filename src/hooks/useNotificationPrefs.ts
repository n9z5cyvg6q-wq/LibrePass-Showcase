/**
 * Shared hook for notification preferences & haptic feedback.
 * Reads from localStorage so every component sees the same prefs.
 */

export interface NotifPrefs {
  sessionReminders: boolean;
  expiryAlerts: boolean;
  promotions: boolean;
  availabilityAlerts: boolean;
}

const STORAGE_KEY = "librepass-notifs";

const defaultPrefs: NotifPrefs = {
  sessionReminders: true,
  expiryAlerts: true,
  promotions: false,
  availabilityAlerts: true,
};

export function getNotifPrefs(): NotifPrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultPrefs, ...JSON.parse(saved) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

/**
 * Trigger haptic vibration only if session reminders are enabled
 * (we treat sessionReminders as the master "haptics" toggle).
 */
export function haptic(pattern: number | number[] = 10): void {
  const prefs = getNotifPrefs();
  if (!prefs.sessionReminders) return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/**
 * Request browser notification permission if not already granted.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (!("Notification" in window)) return null;
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

/**
 * Send a browser notification if the relevant pref is enabled.
 */
export function sendNotification(
  title: string,
  body: string,
  prefKey: keyof NotifPrefs = "sessionReminders"
): void {
  const prefs = getNotifPrefs();
  if (!prefs[prefKey]) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // Silent fail — some browsers block from SW context
  }
}
