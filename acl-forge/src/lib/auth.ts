import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GithubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

const providers = []

// GitHub OAuth (optional — only if env vars set)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== 'your-github-client-id') {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })
  )
}

// Dev credentials login — always available in development
// In production remove this or gate it behind an env flag
providers.push(
  CredentialsProvider({
    name: 'Dev Login',
    credentials: {
      email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
      name: { label: 'Name', type: 'text', placeholder: 'Your Name' },
    },
    async authorize(credentials) {
      if (!credentials?.email) return null

      // Upsert a user by email — no password needed for local dev
      const user = await prisma.user.upsert({
        where: { email: credentials.email },
        update: {},
        create: {
          email: credentials.email,
          name: credentials.name || credentials.email.split('@')[0],
        },
      })

      return { id: user.id, email: user.email, name: user.name }
    },
  })
)

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.id as string
      }
      return session
    },
  },
}
