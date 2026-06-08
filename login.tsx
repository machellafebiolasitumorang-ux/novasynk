import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Email atau password salah')
    } else {
      // Update last_seen
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
      }
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0c0c10', padding:20 }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#7c6cff,#a594ff)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:18, color:'#fff' }}>NS</span>
          </div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:24, color:'#f0efff', letterSpacing:'-0.5px' }}>NOVASYNK</div>
          <div style={{ fontSize:12, color:'#5c5a7a', marginTop:4 }}>Platform Manajemen Organisasi</div>
        </div>

        {/* Form */}
        <div style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:28 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:16, color:'#f0efff', marginBottom:20 }}>Masuk ke akun</div>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'#9896b8', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@novasynk.app"
                required
                style={{ width:'100%' }}
              />
            </div>
            <div style={{ marginBottom:22 }}>
              <label style={{ display:'block', fontSize:11, color:'#9896b8', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width:'100%' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width:'100%', padding:'10px', background:'#7c6cff', border:'none', borderRadius:8, color:'#fff', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:loading?'not-allowed':'pointer', opacity:loading?.7:1 }}
            >
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div style={{ marginTop:20, background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, color:'#5c5a7a', marginBottom:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>Akun Tim</div>
          {[
            ['Machella (Admin)', 'machella@novasynk.app'],
            ['Desi', 'desi@novasynk.app'],
            ['Dhisry', 'dhisry@novasynk.app'],
            ['Maydela', 'maydela@novasynk.app'],
            ['Kholil', 'kholil@novasynk.app'],
          ].map(([name, mail]) => (
            <div
              key={mail}
              onClick={() => { setEmail(mail); setPassword('Nova@2026') }}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
            >
              <span style={{ fontSize:13, color:'#9896b8' }}>{name}</span>
              <span style={{ fontSize:11, color:'#5c5a7a' }}>{mail}</span>
            </div>
          ))}
          <div style={{ fontSize:11, color:'#5c5a7a', marginTop:8 }}>Password: <strong style={{ color:'#a594ff' }}>Nova@2026</strong> · Klik nama untuk isi otomatis</div>
        </div>
      </div>
    </div>
  )
}
