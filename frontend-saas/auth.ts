import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import { comparePasswords } from "@/lib/auth/session"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const rawEmail = (credentials as any)?.email
        const rawPassword = (credentials as any)?.password

        const email = typeof rawEmail === "string" ? rawEmail.trim() : ""
        const password = typeof rawPassword === "string" ? rawPassword : ""

        if (!email || !password) return null

        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_KEY!
        )

        const { data: user, error } = await supabaseAdmin
          .from("users")
          .select("id, email, name, password_hash, deleted_at")
          .eq("email", email)
          .maybeSingle()

        if (error || !user) return null
        if (user.deleted_at) return null
        if (!user.password_hash) return null

        const ok = await comparePasswords(password, user.password_hash)
        if (!ok) return null

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? "",
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id
      }

      if (!token.email) return token

      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      )

      const { data: existingUser, error: selectError } = await supabaseAdmin
        .from("users")
        .select("id, email, name, deleted_at")
        .eq("email", token.email)
        .maybeSingle()

      if (selectError) return token
      if (existingUser?.deleted_at) return token

      if (existingUser) {
        token.id = String(existingUser.id)
        token.name = existingUser.name ?? token.name
        return token
      }

      const insertName =
        typeof token.name === "string" && token.name.trim().length > 0
          ? token.name.trim()
          : null

      const { data: createdUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          email: token.email,
          name: insertName,
        })
        .select("id, email, name, deleted_at")
        .single()

      if (insertError || !createdUser) return token
      if (createdUser.deleted_at) return token

      token.id = String(createdUser.id)
      token.name = createdUser.name ?? token.name

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : ""
        session.user.email = token.email ?? ""
        session.user.name = token.name ?? ""
      }
      return session
    },
  },
})
