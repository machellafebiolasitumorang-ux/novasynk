import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setMembers(data || [])
  }

  async function sendInvite() {
    if (!inviteEmail.includes('@')) { toast.error('Email tidak valid'); return }
    // In production: call Supabase Admin API to invite user
    // For now show instructions
    toast.success(`Panduan: Buka Supabase Dashboard > Auth > Users > Invite User\nEmail: ${inviteEmail}`, { duration: 6000 })
    setShowInvite(false)
    setInviteEmail(''); setInviteName(''); setInviteRole('member')
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    toast.success(current ? 'Anggota dinonaktifkan' : 'Anggota diaktifkan')
    loadData()
  }

  function timeSince(d: string) {
    if (!d) return 'Belum pernah'
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Baru saja'
    if (mins < 60) return `${mins} menit lalu`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} jam lalu`
    return `${Math.floor(hrs / 24)} hari lalu`
  }

  const online = members.filter(m => {
    if (!m.last_seen) return false
    return Date.now() - new Date(m.last_seen).getTime() < 5 * 60 * 1000
  })

  return (
    <Layout title="Anggota Tim">
      {/* Header stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Total Anggota', val:members.length, color:'#a594ff', bg:'rgba(124,108,255,0.1)', icon:'ti-users' },
          { label:'Aktif Sekarang', val:online.length, color:'#2dd6a0', bg:'rgba(45,214,160,0.1)', icon:'ti-circle-check' },
          { label:'Admin', val:members.filter(m=>m.role==='admin').length, color:'#ffb347', bg:'rgba(255,179,71,0.1)', icon:'ti-crown' },
        ].map(s => (
          <div key={s.label} style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize:17, color:s.color }}></i>
            </div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'#f0efff' }}>{s.val}</div>
            <div style={{ fontSize:11, color:'#5c5a7a', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, color:'#9896b8' }}>{members.length} anggota terdaftar</div>
        {profile?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <i className="ti ti-user-plus"></i> Undang Anggota
          </button>
        )}
      </div>

      {/* Member grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
        {members.map(m => {
          const isOnline = m.last_seen && Date.now() - new Date(m.last_seen).getTime() < 5 * 60 * 1000
          return (
            <div key={m.id} style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16, transition:'border-color .15s' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#a594ff,#7c6cff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0, fontFamily:'Syne,sans-serif', position:'relative' }}>
                  {m.name?.slice(0,2).toUpperCase()}
                  <div style={{ position:'absolute', bottom:0, right:0, width:10, height:10, borderRadius:'50%', background: isOnline ? '#2dd6a0' : '#22222f', border:'2px solid #13131a', boxShadow: isOnline ? '0 0 6px #2dd6a0' : 'none' }}></div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#f0efff' }}>{m.name}</div>
                  <div style={{ fontSize:11, color:'#5c5a7a' }}>{m.email}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:8, background: m.role==='admin' ? 'rgba(255,179,71,0.1)' : 'rgba(124,108,255,0.1)', color: m.role==='admin' ? '#ffb347' : '#a594ff', border:`1px solid ${m.role==='admin' ? 'rgba(255,179,71,0.3)' : 'rgba(124,108,255,0.3)'}` }}>
                  {m.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: isOnline ? '#2dd6a0' : '#5c5a7a', boxShadow: isOnline ? '0 0 5px #2dd6a0' : 'none' }}></div>
                <span style={{ fontSize:11, color: isOnline ? '#2dd6a0' : '#5c5a7a' }}>
                  {isOnline ? 'Online' : `Terakhir aktif: ${timeSince(m.last_seen)}`}
                </span>
              </div>

              {/* Activity bar */}
              <div style={{ height:4, background:'#22222f', borderRadius:2, overflow:'hidden', marginBottom:5 }}>
                <div style={{ height:'100%', borderRadius:2, background: isOnline ? '#2dd6a0' : '#7c6cff', width: isOnline ? '85%' : '40%', transition:'width .6s' }}></div>
              </div>
              <div style={{ fontSize:10, color:'#5c5a7a' }}>
                {isOnline ? 'Sangat aktif' : m.is_active ? 'Aktif' : 'Nonaktif'}
              </div>

              {profile?.role === 'admin' && profile.id !== m.id && (
                <button onClick={() => toggleActive(m.id, m.is_active)} style={{ marginTop:10, width:'100%', padding:'6px', background:'transparent', border:'1px solid rgba(255,255,255,0.07)', borderRadius:7, color:'#9896b8', fontSize:11, cursor:'pointer' }}>
                  {m.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowInvite(false)}>✕</button>
            <h2><i className="ti ti-user-plus" style={{ color:'#a594ff' }}></i> Undang Anggota Baru</h2>
            <div style={{ background:'rgba(255,179,71,0.08)', border:'1px solid rgba(255,179,71,0.2)', borderRadius:8, padding:12, marginBottom:4, fontSize:12, color:'#ffb347' }}>
              <i className="ti ti-info-circle" style={{ marginRight:6 }}></i>
              Untuk menambah user, buka <strong>Supabase Dashboard → Authentication → Users → Invite User</strong>, lalu masukkan email dan insert ke tabel profiles.
            </div>
            <label>Nama Lengkap</label>
            <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nama anggota..." style={{ width:'100%' }} />
            <label>Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@domain.com" style={{ width:'100%' }} />
            <label>Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ width:'100%' }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <div className="modal-btns">
              <button className="btn" onClick={() => setShowInvite(false)}>Batal</button>
              <button className="btn btn-primary" onClick={sendInvite}><i className="ti ti-send"></i> Lihat Panduan</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
