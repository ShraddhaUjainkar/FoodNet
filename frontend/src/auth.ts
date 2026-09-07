import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        // Sync with backend to get the stable, persistent Neon DB user ID
        try {
          const API_URL = (
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
          ).replace(/\/$/, "");

          const res = await fetch(`${API_URL}/api/v1/users/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              image: user.image,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user?.id) {
              token.id = data.user.id;
              return token;
            }
          }
        } catch (e) {
          console.error("Failed to sync user in jwt callback:", e);
        }

        // Fallback to stable account providerAccountId or email
        token.id = account?.providerAccountId || user.email || user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
});
