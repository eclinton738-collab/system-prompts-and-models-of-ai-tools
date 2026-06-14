'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navItems = [
    { href: '/dashboard', label: 'PROJECTS' },
    { href: '/exports', label: 'EXPORTS' },
  ]

  return (
    <nav className="h-12 bg-forge-panel border-b border-forge-border flex items-center justify-between px-6 z-50">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="font-bebas text-xl tracking-widest text-forge-text">
          ACL <span className="text-forge-red">FORGE</span>
        </span>
        <span className="text-forge-muted text-xs font-mono hidden sm:block">
          — Where African Combat Becomes Legend.
        </span>
      </Link>

      <div className="flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`font-bebas text-sm tracking-widest transition-colors ${
              pathname.startsWith(item.href)
                ? 'text-forge-red'
                : 'text-forge-muted hover:text-forge-text'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {session?.user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 text-forge-muted hover:text-forge-text transition-colors"
            >
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || ''}
                  className="w-7 h-7 rounded-full border border-forge-border"
                />
              )}
              <span className="font-mono text-xs hidden sm:block">
                {session.user.name || session.user.email}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-10 w-48 bg-forge-panel border border-forge-border rounded shadow-xl z-50">
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                  className="w-full text-left px-4 py-3 text-sm text-forge-muted hover:text-forge-red hover:bg-forge-track transition-colors font-mono"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
