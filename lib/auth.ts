import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { createServerClient } from "./supabase"

declare module "next-auth" {
  interface User {
    id: string
    email: string
    name: string
    role: "admin" | "viewer"
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: "admin" | "viewer"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "admin" | "viewer"
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const supabase = createServerClient()
        
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email as string)
          .single()

        if (error || !user) {
          return null
        }

        const isPasswordValid = await compare(
          credentials.password as string, 
          user.password_hash
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as "admin" | "viewer"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  }
})
