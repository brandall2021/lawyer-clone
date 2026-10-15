import './globals.css'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'LawyerTools Clone',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app">
          <div className="titlebar">
            LawyerTools <span className="muted">clone</span>
            <span className="status">AOSTG · LawyerTools50</span>
          </div>
          <aside className="sidebar">
            <Link className="nav-item" href="/">
              Inicio
            </Link>
            <Link className="nav-item" href="/personas">
              Personas
            </Link>
            <Link className="nav-item" href="/gestiones">
              Gestiones
            </Link>
            <Link className="nav-item" href="/datos">
              Datos
            </Link>
          </aside>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  )
}
