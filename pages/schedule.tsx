import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function SchedulePage() {
  const [events, setEvents] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [form, setForm] = useState({ title:'', description:'', event_at:'', event_end:'', color:'#7c6cff', participants:[] as string[] })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }
    const { data: evs } = await supabase.from('schedules').select('*, creator:created_by(name)').order('event_at')
    setEvents(evs || [])
    const { data: mems } = await supabase.from('profiles').select('id,name').eq('is_active', true)
    setMembers(mems || [])
  }

  async function submitEvent() {
    if (!form.title.trim() || !form.event_at) { toast.error('Judul dan waktu wajib diisi'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('schedules').insert({
      title: form.title,
      description: form.description,
      event_at: form.event_at,
      event_end: form.event_end || null,
      color: form.color,
      participants: form.participants,
      created_by: user?.id,
    })
    if (error) { toast.error(error.message) } else {
      await supabase.from('activity_logs').insert({ user_id: user?.id, action:'create_schedule', detail:`membuat jadwal "${form.title}"` })
      toast.success('Jadwal disimpan!')
      setShowModal(false)
      setForm({ title:'', description:'', event_at:'', event_end:'', color:'#7c6cff', participants:[] })
      loadData()
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Hapus jadwal ini?')) return
    await supabase.from('schedules').delete().eq('id', id)
    toast.success('Jadwal dihapus')
    loadData()
  }

  // Calendar rendering
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']

  function getCalDays() {
    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
    const prevDays = new Date(calYear, calMonth, 0).getDate()
    const cells = []
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, curr: false })
    for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, curr: true })
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 2, curr: false })
    return cells
  }

  function hasEvent(day: number) {
    return events.some(e => {
      const d = new Date(e.event_at)
      return d.getDate() === day && d.getMonth() === calMonth && d.getFullYear() === calYear
    })
  }

  const today = new Date()
  const upcoming = events.filter(e => new Date(e.event_at) >= new Date()).slice(0, 8)
  const past = events.filter(e => new Date(e.event_at) < new Date()).slice(0, 3)

  return (
    <Layout title="Jadwal">
      <div style={{ display:'flex', gap:16, alignItems:'start' }}>
        {/* Left: Calendar */}
        <div style={{ flex:1 }}>
          <div className="card" style={{ marginBottom:16 }}>
            {/* Calendar header */}
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'#f0efff' }}>{MONTHS[calMonth]} {calYear}</span>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn" style={{ padding:'4px 8px' }} onClick={() => { if (calMonth===0){setCalMonth(11);setCalYear(y=>y-1)} else setCalMonth(m=>m-1) }}><i className="ti ti-chevron-left"></i></button>
                <button className="btn" onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()) }} style={{ padding:'4px 10px', fontSize:11 }}>Hari ini</button>
                <button className="btn" style={{ padding:'4px 8px' }} onClick={() => { if (calMonth===11){setCalMonth(0);setCalYear(y=>y+1)} else setCalMonth(m=>m+1) }}><i className="ti ti-chevron-right"></i></button>
              </div>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:6 }}>
                {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, color:'#5c5a7a', fontFamily:'Syne,sans-serif', fontWeight:600, padding:'3px 0' }}>{d}</div>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
                {getCalDays().map((cell, i) => {
                  const isToday = cell.curr && cell.day===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear()
                  const evnt = cell.curr && hasEvent(cell.day)
                  return (
                    <div key={i} style={{ aspectRatio:'1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color: !cell.curr ? '#2a2a3a' : isToday ? '#fff' : '#9896b8', borderRadius:6, background: isToday ? '#7c6cff' : 'transparent', cursor:'pointer', position:'relative', transition:'all .12s' }}
                      onClick={() => isToday || cell.curr ? null : null}>
                      {cell.day}
                      {evnt && <div style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background: isToday ? '#fff' : '#2dd6a0' }}></div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Past events */}
          {past.length > 0 && (
            <div className="card">
              <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#5c5a7a' }}>Jadwal Lewat</span>
              </div>
              {past.map(e => (
                <div key={e.id} style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:10, opacity:.5 }}>
                  <div style={{ width:3, borderRadius:2, background:e.color, alignSelf:'stretch', flexShrink:0 }}></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:'#f0efff', textDecoration:'line-through' }}>{e.title}</div>
                    <div style={{ fontSize:10, color:'#5c5a7a', marginTop:2 }}>{new Date(e.event_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Upcoming events */}
        <div style={{ width:300, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#f0efff' }}>Jadwal Mendatang</span>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ padding:'6px 12px', fontSize:11 }}>
              <i className="ti ti-plus"></i> Buat
            </button>
          </div>

          {upcoming.length === 0 ? (
            <div style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:30, textAlign:'center', color:'#5c5a7a', fontSize:13 }}>
              Belum ada jadwal mendatang
            </div>
          ) : upcoming.map(e => (
            <div key={e.id} style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 14px', marginBottom:8, display:'flex', gap:10, cursor:'pointer', transition:'border-color .15s' }}>
              <div style={{ width:3, borderRadius:2, background:e.color, alignSelf:'stretch', flexShrink:0 }}></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:'#f0efff', marginBottom:3 }}>{e.title}</div>
                <div style={{ fontSize:11, color:'#5c5a7a', display:'flex', alignItems:'center', gap:4, marginBottom:e.description?4:0 }}>
                  <i className="ti ti-clock" style={{ fontSize:12 }}></i>
                  {new Date(e.event_at).toLocaleDateString('id-ID',{day:'numeric',month:'short'})} · {new Date(e.event_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})} WIB
                </div>
                {e.description && <div style={{ fontSize:11, color:'#5c5a7a' }}>{e.description}</div>}
                {e.participants?.length > 0 && (
                  <div style={{ display:'flex', marginTop:6 }}>
                    {e.participants.slice(0,4).map((pid:string) => {
                      const m = members.find(x => x.id===pid)
                      return m ? <div key={pid} style={{ width:18, height:18, borderRadius:'50%', background:'rgba(124,108,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'#a594ff', border:'1.5px solid #13131a', marginRight:-4 }}>{m.name.slice(0,2).toUpperCase()}</div> : null
                    })}
                  </div>
                )}
              </div>
              {(profile?.role==='admin' || e.created_by===profile?.id) && (
                <button onClick={() => deleteEvent(e.id)} style={{ background:'none', border:'none', color:'#5c5a7a', cursor:'pointer', fontSize:16, alignSelf:'flex-start' }}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h2><i className="ti ti-calendar-plus" style={{ color:'#a594ff' }}></i> Buat Jadwal Baru</h2>
            <label>Judul *</label>
            <input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Nama acara..." style={{ width:'100%' }} />
            <label>Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({...form,description:e.target.value})} rows={2} style={{ width:'100%', resize:'vertical' }} placeholder="Deskripsi singkat..." />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div><label>Mulai *</label><input type="datetime-local" value={form.event_at} onChange={e => setForm({...form,event_at:e.target.value})} style={{ width:'100%' }} /></div>
              <div><label>Selesai</label><input type="datetime-local" value={form.event_end} onChange={e => setForm({...form,event_end:e.target.value})} style={{ width:'100%' }} /></div>
            </div>
            <label>Warna</label>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              {['#7c6cff','#2dd6a0','#ffb347','#ff6b7a','#5baeff'].map(c => (
                <div key={c} onClick={() => setForm({...form,color:c})} style={{ width:24, height:24, borderRadius:'50%', background:c, cursor:'pointer', border: form.color===c ? '2px solid #fff' : '2px solid transparent', transition:'border .15s' }}></div>
              ))}
            </div>
            <label>Peserta</label>
            <select multiple value={form.participants} onChange={e => setForm({...form,participants:Array.from(e.target.selectedOptions,o=>o.value)})} style={{ width:'100%', height:90 }}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="modal-btns">
              <button className="btn" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={submitEvent}><i className="ti ti-check"></i> Simpan</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
