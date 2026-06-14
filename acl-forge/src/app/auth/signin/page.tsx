'use client'

import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignInPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) router.push('/dashboard')
  }, [session, router])

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email: email.trim(),
      name: name.trim() || email.split('@')[0],
      redirect: false,
    })

    if (res?.error) {
      setError('Sign in failed — check your setup.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center relative overflow-hidden">
      {/* Background grid texture */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C8321E' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-bebas text-6xl tracking-widest text-forge-text mb-1">
            ACL <span className="text-forge-red">FORGE</span>
          </h1>
          <p className="text-forge-muted font-mono text-sm">
            Where African Combat Becomes Legend.
          </p>
          <div className="mt-4 w-16 h-0.5 bg-forge-red mx-auto" />
        </div>

        <div className="forge-modal p-8 space-y-6">
          <h2 className="font-bebas text-2xl tracking-widest text-center text-forge-text">
            ACCESS THE FORGE
          </h2>

          {/* Email / Dev Login */}
          <form onSubmit={handleDevLogin} className="space-y-3">
            <div>
              <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-1.5">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Kwame Mensah"
                className="forge-input w-full px-4 py-3 text-forge-text placeholder-forge-border text-sm"
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-forge-muted uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="forge-input w-full px-4 py-3 text-forge-text placeholder-forge-border text-sm"
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-forge-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full btn-forge py-3 font-bebas text-lg tracking-widest disabled:opacity-40 mt-1"
            >
              {loading ? 'ENTERING...' : 'ENTER THE FORGE'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-forge-border" />
            <span className="font-mono text-xs text-forge-border">or</span>
            <div className="flex-1 h-px bg-forge-border" />
          </div>

          {/* GitHub OAuth */}
          <button
            onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-forge-panel-light border border-forge-border rounded hover:border-forge-red hover:bg-forge-track transition-all text-forge-text font-mono text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <p className="text-center text-forge-muted text-xs font-mono mt-6 opacity-40">
          Local dev: email login requires no password
        </p>
      </div>
    </div>
  )
}
