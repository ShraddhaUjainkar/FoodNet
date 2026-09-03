/**
 * Syncs the authenticated session user to the backend PostgreSQL User table in Neon.
 */
export async function syncUserToDatabase(user: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<void> {
  if (typeof window === "undefined" || !user?.email) return;

  const API_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  ).replace(/\/$/, "");

  try {
    await fetch(`${API_URL}/api/v1/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id || undefined,
        email: user.email,
        name: user.name || undefined,
        image: user.image || undefined,
      }),
    });
  } catch (err) {
    console.error("Failed to sync user to database:", err);
  }
}
