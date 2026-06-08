import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const publicRoutes = ['/login', '/share/[token]']
      const isPublicRoute = publicRoutes.some(r =>
        router.pathname === r || router.pathname.startsWith('/share/')
      )
      if (!session && !isPublicRoute) {
        router.push('/login')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && router.pathname !== '/login' && !router.pathname.startsWith('/share/')) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0c0c10', color:'#a594ff', fontFamily:'sans-serif', fontSize:14 }}>
      Memuat NOVASYNK...
    </div>
  )

  return (
    <>
      <Head>
        <title>NOVASYNK</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      </Head>
      <Toaster position="bottom-right" toastOptions={{
        style: { background: '#1a1a24', color: '#f0efff', border: '1px solid rgba(255,255,255,0.1)', fontSize: 13 },
      }} />
      <Component {...pageProps} />
    </>
  )
}
