/**
 * Utility to retrieve, create, and manage persistent guest session IDs.
 * Synchronized between localStorage and document.cookie to align with backend middleware.
 */

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";

  try {
    let guestId = localStorage.getItem("foodnet_guest_id");

    if (!guestId) {
      // Check if backend or browser set a guestId cookie
      const cookieMatch = document.cookie.match(/(?:^|;\s*)guestId=([^;]+)/);
      if (cookieMatch && cookieMatch[1]) {
        guestId = decodeURIComponent(cookieMatch[1]);
      } else {
        guestId = `guest_${crypto.randomUUID()}`;
        document.cookie = `guestId=${guestId}; path=/; max-age=31536000; SameSite=Lax`;
      }
      localStorage.setItem("foodnet_guest_id", guestId);
    }
    return guestId;
  } catch {
    return "guest_temporary";
  }
}

/**
 * Automatically migrate guest scans to an authenticated user account upon sign-in.
 */
export async function migrateGuestScansIfAny(userId: string): Promise<number> {
  if (typeof window === "undefined" || !userId) return 0;

  try {
    const guestId = localStorage.getItem("foodnet_guest_id");
    if (!guestId || guestId === userId) return 0;

    const API_URL = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    ).replace(/\/$/, "");

    const res = await fetch(`${API_URL}/api/v1/scans/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, userId }),
    });

    if (res.ok) {
      const data = await res.json();
      // Remove guest ID so we don't attempt to re-migrate repeatedly
      localStorage.removeItem("foodnet_guest_id");
      return data.migratedCount || 0;
    }
  } catch (err) {
    console.error("Failed to auto-migrate guest scans:", err);
  }
  return 0;
}
