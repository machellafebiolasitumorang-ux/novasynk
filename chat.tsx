import { useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

const CHANNELS = ['umum','desain','dev-backend','dev-frontend','leads-only']

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [channel, setChannel] = useState('umum')
  const [profile, setProfile] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    })
  }, [])

  useEffect(() => {
    loadMessages()
    const sub = supabase.channel('chat-' + channel)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`channel=eq.${channel}` }, payload => {
        setMessages(prev => [...prev, payload.new])
        // Fetch sender info
        loadMessages()
      })
      .subscribe()
    return () => { sub.unsubscribe() }
  }, [channel])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(name,id)')
      .eq('channel', channel)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('messages').insert({ channel, sender_id: user?.id, content: input.trim() })
    setInput('')
    setSending(false)
  }

  function timeStr(d: string) {
    return new Date(d).toLocaleTimeString('id-ID',{ hour:'2-digit', minute:'2-digit' })
  }

  function dateSep(d: string) {
    const date = new Date(d)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) return 'Hari ini'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) return 'Kemarin'
    return date.toLocaleDateString('id-ID',{ weekday:'long', day:'numeric', month:'long' })
  }

  return (
    <Layout title="">
      <div style={{ display:'flex', height:'calc(100vh - 60px)', margin:'-20px -24px' }}>
        {/* Channel list */}
        <div style={{ width:200, background:'#13131a', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', flexShrink:0 }}>
          <div style={{ padding:'13px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:700, color:'#f0efff' }}>Pesan</span>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
            <div style={{ padding:'8px 14px 4px', fontSize:10, color:'#5c5a7a', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Channel</div>
            {CHANNELS.map(ch => (
              <div key={ch} onClick={() => setChannel(ch)} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 10px', margin:'1px 4px', fontSize:12, color: ch===channel ? '#a594ff' : '#9896b8', cursor:'pointer', borderRadius:8, background: ch===channel ? 'rgba(124,108,255,0.12)' : 'transparent', border: ch===channel ? '1px solid rgba(124,108,255,0.3)' : '1px solid transparent', transition:'all .12s' }}>
                <i className="ti ti-hash" style={{ fontSize:14 }}></i>
                {ch}
              </div>
            ))}
          </div>
        </div>

        {/* Chat main */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#f0efff' }}>
              <i className="ti ti-hash" style={{ color:'#a594ff' }}></i> {channel}
            </div>
            <div style={{ fontSize:11, color:'#5c5a7a', marginTop:1 }}>Channel {channel} · {messages.length} pesan</div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:2 }}>
            {messages.length === 0 && (
              <div style={{ textAlign:'center', padding:40, color:'#5c5a7a', fontSize:13 }}>Belum ada pesan di #{channel}. Mulai percakapan!</div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === profile?.id
              const showDate = i === 0 || dateSep(msg.created_at) !== dateSep(messages[i-1].created_at)
              const showAvatar = i === 0 || msg.sender_id !== messages[i-1].sender_id
              return (
                <div key={msg.id}>
                  {showDate && (
                    <div style={{ textAlign:'center', fontSize:10, color:'#5c5a7a', margin:'12px 0', display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}></div>
                      {dateSep(msg.created_at)}
                      <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }}></div>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10, marginBottom:12, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background: isMe ? 'linear-gradient(135deg,#a594ff,#7c6cff)' : '#22222f', display: showAvatar ? 'flex' : 'flex', visibility: showAvatar ? 'visible' : 'hidden', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0, marginTop:2 }}>
                      {(msg.sender?.name || 'U').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {showAvatar && (
                        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'#f0efff' }}>{isMe ? 'Kamu' : (msg.sender?.name || 'User')}</span>
                          <span style={{ fontSize:10, color:'#5c5a7a' }}>{timeStr(msg.created_at)}</span>
                        </div>
                      )}
                      <div style={{ fontSize:13, color: isMe ? '#f0efff' : '#9896b8', lineHeight:1.6, background: isMe ? 'rgba(124,108,255,0.15)' : '#1a1a24', padding:'9px 13px', borderRadius: isMe ? '12px 3px 12px 12px' : '3px 12px 12px 12px', display:'inline-block', maxWidth:'70%', border:`1px solid ${isMe ? 'rgba(124,108,255,0.3)' : 'rgba(255,255,255,0.07)'}`, wordBreak:'break-word' }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef}></div>
          </div>

          {/* Input */}
          <div style={{ padding:'12px 18px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(255,255,255,0.13)', borderRadius:12, padding:'8px 12px', background:'#1a1a24' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} placeholder={`Ketik pesan ke #${channel}...`} style={{ flex:1, border:'none', background:'transparent', padding:0, outline:'none', fontSize:13 }} />
              <button onClick={sendMessage} disabled={sending || !input.trim()} style={{ width:30, height:30, borderRadius:8, background:'#7c6cff', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor: sending||!input.trim() ? 'not-allowed' : 'pointer', opacity: sending||!input.trim() ? .5 : 1 }}>
                <i className="ti ti-send" style={{ fontSize:14, color:'#fff' }}></i>
              </button>
            </div>
            <div style={{ fontSize:10, color:'#5c5a7a', marginTop:5 }}>Enter untuk kirim · Pesan tersimpan permanen</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
