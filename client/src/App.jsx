import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import SockJS from 'sockjs-client'
import { Stomp } from 'stompjs/lib/stomp'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
const TOKEN_KEY = 'lostfound.token'
const ROLE_KEY = 'lostfound.role'

const api = axios.create({ baseURL: API_BASE })

const emptyReport = {
  itemName: '',
  description: '',
  location: '',
  eventDate: new Date().toISOString().slice(0, 10),
  latitude: '',
  longitude: '',
  image: null,
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function decodePayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function isTokenExpired(token) {
  const payload = decodePayload(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= Date.now()
}

function getStoredToken() {
  const storedToken = localStorage.getItem(TOKEN_KEY) || ''
  if (!storedToken || isTokenExpired(storedToken)) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    return ''
  }
  return storedToken
}

function decodeEmail(token) {
  const payload = decodePayload(token)
  if (!payload) {
    return 'signed-in user'
  }
  return payload.sub || payload.email || 'signed-in user'
}

function toItemFormData(form) {
  const dto = {
    itemName: form.itemName,
    description: form.description,
    location: form.location,
    eventDate: form.eventDate,
    latitude: form.latitude ? Number(form.latitude) : null,
    longitude: form.longitude ? Number(form.longitude) : null,
  }

  const payload = new FormData()
  payload.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }))
  payload.append('image', form.image)
  return payload
}

function statusClass(status = '') {
  return status.toLowerCase().replaceAll('_', '-')
}

function getChatReceiver(item, currentEmail) {
  if (!item || !currentEmail) return ''
  if (item.reportedBy && item.reportedBy !== currentEmail) return item.reportedBy
  if (item.claimedBy && item.claimedBy !== currentEmail) return item.claimedBy
  return ''
}

function App() {
  const [token, setToken] = useState(getStoredToken)
  const [role, setRole] = useState(() => (token ? localStorage.getItem(ROLE_KEY) || '' : ''))
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [items, setItems] = useState([])
  const [claims, setClaims] = useState([])
  const [adminItems, setAdminItems] = useState([])
  const [users, setUsers] = useState([])
  const [reportType, setReportType] = useState('lost')
  const [reportForm, setReportForm] = useState(emptyReport)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedItem, setSelectedItem] = useState(null)
  const [matches, setMatches] = useState([])
  const [chatItem, setChatItem] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatText, setChatText] = useState('')
  const [chatConnected, setChatConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const chatClientRef = useRef(null)

  const signedInEmail = useMemo(() => (token ? decodeEmail(token) : ''), [token])
  const isAdmin = role === 'ROLE_ADMIN'

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => {
      const statusMatch = statusFilter === 'ALL' || item.status === statusFilter
      const queryMatch = !needle || [item.itemName, item.description, item.location, item.reportedBy]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle))
      return statusMatch && queryMatch
    })
  }, [items, query, statusFilter])

  const metrics = useMemo(() => {
    const total = items.length
    const lost = items.filter((item) => item.status === 'LOST').length
    const found = items.filter((item) => item.status === 'FOUND').length
    const claimed = items.filter((item) => item.status === 'CLAIMED').length
    return { total, lost, found, claimed }
  }, [items])

  const mapItems = useMemo(
    () => filteredItems.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)),
    [filteredItems],
  )

  const loadAdminData = useCallback(async (activeToken = token) => {
    if (role && !isAdmin) {
      setUsers([])
      setAdminItems([])
      return
    }

    try {
      const [usersResponse, itemsResponse] = await Promise.all([
        api.get('/admin', { headers: authHeaders(activeToken) }),
        api.get('/admin/items', { headers: authHeaders(activeToken) }),
      ])
      setUsers(usersResponse.data || [])
      setAdminItems(itemsResponse.data || [])
      if (!isAdmin) {
        localStorage.setItem(ROLE_KEY, 'ROLE_ADMIN')
        setRole('ROLE_ADMIN')
      }
    } catch {
      setUsers([])
      setAdminItems([])
    }
  }, [isAdmin, role, token])

  const refreshData = useCallback(async (activeToken = token) => {
    if (!activeToken || isTokenExpired(activeToken)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
      setToken('')
      setRole('')
      setItems([])
      setClaims([])
      setAdminItems([])
      setUsers([])
      setError('Your session expired. Please log in again.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const [itemResponse, claimResponse] = await Promise.all([
        api.get('/items', { headers: authHeaders(activeToken) }),
        api.get('/claims', { headers: authHeaders(activeToken) }).catch(() => ({ data: [] })),
      ])
      setItems(itemResponse.data || [])
      setClaims(claimResponse.data || [])
      await loadAdminData(activeToken)
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(ROLE_KEY)
        setToken('')
        setRole('')
        setItems([])
        setClaims([])
        setAdminItems([])
        setUsers([])
        setError('Your session expired. Please log in again.')
        return
      }
      setError(readError(err, 'Could not load dashboard data. Is the Spring Boot backend running?'))
    } finally {
      setLoading(false)
    }
  }, [loadAdminData, token])

  useEffect(() => {
    if (!token) return
    refreshData(token)
  }, [refreshData, token])

  useEffect(() => {
    if (!chatItem || !token) return undefined

    let cancelled = false
    setChatConnected(false)
    setChatMessages([])

    api.get(`/messages/${chatItem.id}`, { headers: authHeaders(token) })
      .then(({ data }) => {
        if (!cancelled) setChatMessages(data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(readError(err, 'Could not load chat history.'))
      })

    const socket = new SockJS(`${API_BASE}/chat`)
    const client = Stomp.over(socket)
    client.debug = null

    client.connect(
      {},
      () => {
        if (cancelled) return
        setChatConnected(true)
        client.subscribe(`/topic/chat/${chatItem.id}`, (frame) => {
          const incoming = JSON.parse(frame.body)
          setChatMessages((current) => {
            if (incoming.id && current.some((message) => message.id === incoming.id)) {
              return current
            }
            return [...current, incoming]
          })
        })
      },
      () => {
        if (!cancelled) setChatConnected(false)
      },
    )

    chatClientRef.current = client

    return () => {
      cancelled = true
      setChatConnected(false)
      if (chatClientRef.current?.connected) {
        chatClientRef.current.disconnect()
      }
      chatClientRef.current = null
    }
  }, [chatItem, token])

  async function handleAuth(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const body = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : authForm
      const { data } = await api.post(endpoint, body)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(ROLE_KEY, data.role || '')
      setToken(data.token)
      setRole(data.role || '')
      setNotice(authMode === 'login' ? 'Welcome back. Your board is ready.' : 'Account created. Your recovery desk is open.')
    } catch (err) {
      setError(readError(err, 'Authentication failed. Check your details and try again.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleReport(event) {
    event.preventDefault()
    if (!reportForm.image) {
      setError('Please attach an image before reporting an item.')
      return
    }

    setLoading(true)
    setError('')
    setNotice('')
    try {
      await api.post(`/items/${reportType}`, toItemFormData(reportForm), {
        headers: { ...authHeaders(token), 'Content-Type': 'multipart/form-data' },
      })
      setReportForm(emptyReport)
      setNotice(`${reportType === 'lost' ? 'Lost' : 'Found'} item report published.`)
      await refreshData()
    } catch (err) {
      setError(readError(err, 'Could not publish item report.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleClaim(itemId) {
    setLoading(true)
    setError('')
    try {
      await api.post(`/claims/${itemId}`, null, { headers: authHeaders(token) })
      setNotice('Claim request sent to the item owner.')
      await refreshData()
    } catch (err) {
      setError(readError(err, 'Could not request this claim.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleInstantClaim(itemId) {
    setLoading(true)
    setError('')
    try {
      await api.post(`/items/${itemId}/claim`, null, { headers: authHeaders(token) })
      setNotice('Item marked as claimed.')
      await refreshData()
    } catch (err) {
      setError(readError(err, 'Could not mark this item claimed.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleClaimDecision(claimId, decision) {
    setLoading(true)
    setError('')
    try {
      await api.post(`/claims/${claimId}/${decision}`, null, { headers: authHeaders(token) })
      setNotice(`Claim ${decision === 'approve' ? 'approved' : 'rejected'}.`)
      await refreshData()
    } catch (err) {
      setError(readError(err, 'Could not update claim.'))
    } finally {
      setLoading(false)
    }
  }

  async function showMatches(item) {
    setSelectedItem(item)
    setMatches([])
    setError('')
    try {
      const { data } = await api.get(`/items/${item.id}/matches`, { headers: authHeaders(token) })
      setMatches(data || [])
    } catch (err) {
      setError(readError(err, 'Could not load matches for this item.'))
    }
  }

  function openChat(item) {
    setSelectedItem(null)
    setError('')
    setChatItem(item)
    setChatText('')
  }

  function closeChat() {
    setChatItem(null)
    setChatMessages([])
    setChatText('')
  }

  function sendChatMessage(event) {
    event.preventDefault()
    const message = chatText.trim()
    if (!message || !chatItem) return

    const receiverEmail = getChatReceiver(chatItem, signedInEmail)
    if (!receiverEmail) {
      setError('This item does not have another user to chat with yet.')
      return
    }

    if (!chatClientRef.current?.connected) {
      setError('Chat is still connecting. Try again in a moment.')
      return
    }

    chatClientRef.current.send('/app/sendMessage', {}, JSON.stringify({
      itemId: chatItem.id,
      senderEmail: signedInEmail,
      receiverEmail,
      context: message,
    }))
    setChatText('')
  }

  async function deleteAdminItem(itemId) {
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
      setToken('')
      setRole('')
      setUsers([])
      setAdminItems([])
      setError('Your session expired. Please log in again.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await api.delete(`/admin/item/${itemId}`, { headers: authHeaders(token) })
      setNotice('Admin item removed.')
      await refreshData()
    } catch (err) {
      if (err?.response?.status === 403) {
        localStorage.removeItem(ROLE_KEY)
        setRole('')
        setUsers([])
        setAdminItems([])
      }
      setError(readError(err, 'Could not delete item. Admin access may be required.'))
    } finally {
      setLoading(false)
    }
  }

  async function makeAdmin(userId) {
    setLoading(true)
    setError('')
    try {
      await api.post(`/admin/users/${userId}/make-admin`, null, { headers: authHeaders(token) })
      setNotice('User promoted to admin.')
      await refreshData()
    } catch (err) {
      setError(readError(err, 'Could not promote user.'))
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    setToken('')
    setRole('')
    setItems([])
    setClaims([])
    setAdminItems([])
    setUsers([])
    setNotice('Signed out.')
  }

  if (!token) {
    return (
      <main className="auth-page">
        <section className="auth-hero">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <p className="eyebrow">Campus recovery system</p>
          <h1>Lost things deserve a dramatic comeback.</h1>
          <p className="hero-copy">
            A polished command center for lost and found reports, visual matching, claims, and admin review.
          </p>
          <div className="hero-grid">
            <span>Photo-first reports</span>
            <span>Location-aware map</span>
            <span>Owner claim workflow</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="mode-switch" aria-label="Authentication mode">
            <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Login</button>
            <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Register</button>
          </div>
          <h2>{authMode === 'login' ? 'Open your desk' : 'Create your desk'}</h2>
          <form onSubmit={handleAuth} className="stacked-form">
            {authMode === 'register' && (
              <label>
                Name
                <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required />
              </label>
            )}
            <label>
              Email
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required minLength={4} />
            </label>
            <button className="primary-btn" disabled={loading}>{loading ? 'Working...' : authMode === 'login' ? 'Login' : 'Register'}</button>
          </form>
          <Feedback error={error} notice={notice} />
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Lost & Found HQ</p>
          <h1>Recovery dashboard</h1>
        </div>
        <div className="session-pill">
          <span>{signedInEmail}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <Feedback error={error} notice={notice} />

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Live overview</p>
          <h2>Bring reports, places, and people into one beautiful little orbit.</h2>
          <p>Connected to `{API_BASE}`. Use `VITE_API_BASE_URL` if your backend runs elsewhere.</p>
        </div>
        <button className="ghost-btn" onClick={() => refreshData()} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh data'}</button>
      </section>

      <section className="metric-grid">
        <Metric label="Total reports" value={metrics.total} tone="ink" />
        <Metric label="Lost" value={metrics.lost} tone="lost" />
        <Metric label="Found" value={metrics.found} tone="found" />
        <Metric label="Claimed" value={metrics.claimed} tone="claimed" />
      </section>

      <section className="workbench">
        <ReportForm
          reportType={reportType}
          setReportType={setReportType}
          reportForm={reportForm}
          setReportForm={setReportForm}
          onSubmit={handleReport}
          loading={loading}
        />
        <MapPanel items={mapItems} />
      </section>

      <section className="catalog-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Item board</p>
            <h2>Reports that need attention</h2>
          </div>
          <div className="filters">
            <input placeholder="Search items, locations, people..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All status</option>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
              <option value="CLAIMED">Claimed</option>
            </select>
          </div>
        </div>
        <div className="item-grid">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClaim={handleClaim}
              onInstantClaim={handleInstantClaim}
              onMatches={showMatches}
              onChat={openChat}
            />
          ))}
        </div>
        {!filteredItems.length && <EmptyState title="No reports found" copy="Try another filter or publish the first item report." />}
      </section>

      <section className="lower-grid">
        <ClaimsPanel claims={claims} onDecision={handleClaimDecision} />
        <AdminPanel isAdmin={isAdmin} users={users} items={adminItems} onDelete={deleteAdminItem} onMakeAdmin={makeAdmin} />
      </section>

      {selectedItem && (
        <aside className="drawer">
          <button className="drawer-close" onClick={() => setSelectedItem(null)}>Close</button>
          <p className="eyebrow">Possible matches</p>
          <h2>{selectedItem.itemName}</h2>
          <div className="match-list">
            {matches.map((match) => <MiniItem key={match.id} item={match} />)}
            {!matches.length && <EmptyState title="No matches yet" copy="The matching service did not find similar opposite-status items." />}
          </div>
        </aside>
      )}

      {chatItem && (
        <ChatDrawer
          item={chatItem}
          messages={chatMessages}
          text={chatText}
          setText={setChatText}
          currentEmail={signedInEmail}
          connected={chatConnected}
          onClose={closeChat}
          onSend={sendChatMessage}
        />
      )}
    </main>
  )
}

function Metric({ label, value, tone }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function Feedback({ error, notice }) {
  if (!error && !notice) return null
  return (
    <div className="feedback-wrap">
      {error && <p className="feedback error">{error}</p>}
      {notice && <p className="feedback notice">{notice}</p>}
    </div>
  )
}

function ReportForm({ reportType, setReportType, reportForm, setReportForm, onSubmit, loading }) {
  return (
    <section className="report-card">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">New report</p>
          <h2>Publish an item</h2>
        </div>
        <div className="segmented">
          <button type="button" className={reportType === 'lost' ? 'active' : ''} onClick={() => setReportType('lost')}>Lost</button>
          <button type="button" className={reportType === 'found' ? 'active' : ''} onClick={() => setReportType('found')}>Found</button>
        </div>
      </div>

      <form className="report-form" onSubmit={onSubmit}>
        <label>
          Item name
          <input value={reportForm.itemName} onChange={(event) => setReportForm({ ...reportForm, itemName: event.target.value })} required placeholder="Blue backpack, keys, wallet..." />
        </label>
        <label>
          Description
          <textarea value={reportForm.description} onChange={(event) => setReportForm({ ...reportForm, description: event.target.value })} required placeholder="Add color, marks, brand, contents, or anything memorable." />
        </label>
        <div className="two-col">
          <label>
            Location
            <input value={reportForm.location} onChange={(event) => setReportForm({ ...reportForm, location: event.target.value })} required placeholder="Library desk" />
          </label>
          <label>
            Event date
            <input type="date" value={reportForm.eventDate} onChange={(event) => setReportForm({ ...reportForm, eventDate: event.target.value })} required />
          </label>
        </div>
        <div className="two-col">
          <label>
            Latitude
            <input type="number" step="any" value={reportForm.latitude} onChange={(event) => setReportForm({ ...reportForm, latitude: event.target.value })} placeholder="12.9716" />
          </label>
          <label>
            Longitude
            <input type="number" step="any" value={reportForm.longitude} onChange={(event) => setReportForm({ ...reportForm, longitude: event.target.value })} placeholder="77.5946" />
          </label>
        </div>
        <label className="file-input">
          Item image
          <input type="file" accept="image/*" onChange={(event) => setReportForm({ ...reportForm, image: event.target.files?.[0] || null })} required />
        </label>
        <button className="primary-btn" disabled={loading}>{loading ? 'Publishing...' : `Report ${reportType}`}</button>
      </form>
    </section>
  )
}

function MapPanel({ items }) {
  const center = items.length ? [items[0].latitude, items[0].longitude] : [20.5937, 78.9629]

  return (
    <section className="map-card">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Map</p>
          <h2>Where things surfaced</h2>
        </div>
        <span className="map-count">{items.length} pins</span>
      </div>
      <div className="map-frame">
        <MapContainer center={center} zoom={items.length ? 13 : 4} scrollWheelZoom className="leaflet-map">
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {items.map((item) => (
            <CircleMarker
              key={item.id}
              center={[item.latitude, item.longitude]}
              radius={10}
              pathOptions={{ color: item.status === 'LOST' ? '#d84f31' : '#146b55', fillColor: item.status === 'LOST' ? '#f08a5d' : '#54d2a0', fillOpacity: 0.82 }}
            >
              <Popup>
                <strong>{item.itemName}</strong><br />
                {item.status} at {item.location}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </section>
  )
}

function ItemCard({ item, onClaim, onInstantClaim, onMatches, onChat }) {
  return (
    <article className="item-card">
      <div className="image-wrap">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.itemName} /> : <div className="image-placeholder">No image</div>}
        <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span>
      </div>
      <div className="item-body">
        <h3>{item.itemName}</h3>
        <p>{item.description}</p>
        <dl>
          <div><dt>Location</dt><dd>{item.location || 'Unknown'}</dd></div>
          <div><dt>Date</dt><dd>{item.eventDate || 'Unknown'}</dd></div>
          <div><dt>Reporter</dt><dd>{item.reportedBy || 'Unknown'}</dd></div>
          {item.claimedBy && <div><dt>Claimed by</dt><dd>{item.claimedBy}</dd></div>}
        </dl>
        <div className="card-actions">
          <button onClick={() => onClaim(item.id)}>Request claim</button>
          <button onClick={() => onInstantClaim(item.id)}>Mark claimed</button>
          <button onClick={() => onMatches(item)}>Matches</button>
          <button onClick={() => onChat(item)}>Chat</button>
        </div>
      </div>
    </article>
  )
}

function ChatDrawer({ item, messages, text, setText, currentEmail, connected, onClose, onSend }) {
  const receiverEmail = getChatReceiver(item, currentEmail)

  return (
    <aside className="drawer chat-drawer">
      <button className="drawer-close" onClick={onClose}>Close</button>
      <p className="eyebrow">Item chat</p>
      <h2>{item.itemName}</h2>
      <div className="chat-meta">
        <span>{connected ? 'Connected' : 'Connecting...'}</span>
        <small>{receiverEmail ? `With ${receiverEmail}` : 'No receiver available yet'}</small>
      </div>

      <div className="chat-list">
        {messages.map((message) => {
          const mine = message.senderEmail === currentEmail
          return (
            <div className={`chat-message ${mine ? 'mine' : ''}`} key={message.id || `${message.timestamp}-${message.content}`}>
              <strong>{mine ? 'You' : message.senderEmail}</strong>
              <p>{message.content}</p>
              {message.timestamp && <small>{new Date(message.timestamp).toLocaleString()}</small>}
            </div>
          )
        })}
        {!messages.length && <EmptyState title="No messages yet" copy="Start the conversation about this item." />}
      </div>

      <form className="chat-form" onSubmit={onSend}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={receiverEmail ? 'Type a message...' : 'Another user must be attached to this item first.'}
          disabled={!receiverEmail}
        />
        <button className="primary-btn" disabled={!connected || !receiverEmail || !text.trim()}>Send</button>
      </form>
    </aside>
  )
}

function ClaimsPanel({ claims, onDecision }) {
  return (
    <section className="panel-card">
      <p className="eyebrow">Claims</p>
      <h2>Requests queue</h2>
      <div className="table-list">
        {claims.map((claim) => (
          <div className="row-card" key={claim.id}>
            <div>
              <strong>{claim.itemName}</strong>
              <span>{claim.claimantEmail}</span>
            </div>
            <span className={`status-badge ${statusClass(claim.status)}`}>{claim.status}</span>
            <div className="row-actions">
              <button onClick={() => onDecision(claim.id, 'approve')}>Approve</button>
              <button onClick={() => onDecision(claim.id, 'reject')}>Reject</button>
            </div>
          </div>
        ))}
        {!claims.length && <EmptyState title="No claims" copy="Claim requests will appear here." />}
      </div>
    </section>
  )
}

function AdminPanel({ isAdmin, users, items, onDelete, onMakeAdmin }) {
  return (
    <section className="panel-card admin-panel">
      <p className="eyebrow">Admin</p>
      <h2>Control room</h2>
      {!isAdmin ? (
        <EmptyState title="Admin locked" copy="Login with an admin account to manage users and remove reports." />
      ) : (
        <>
          <h3>Users</h3>
          <div className="admin-list">
            {users.map((user) => (
              <div className="admin-row" key={user.id}>
                <span>{user.email}</span>
                <small>{user.role}</small>
                <button onClick={() => onMakeAdmin(user.id)}>Make admin</button>
              </div>
            ))}
          </div>
          <h3>Items</h3>
          <div className="admin-list">
            {items.slice(0, 6).map((item) => (
              <div className="admin-row" key={item.id}>
                <span>{item.itemName}</span>
                <small>{item.status}</small>
                <button onClick={() => onDelete(item.id)}>Delete</button>
              </div>
            ))}
            {!items.length && <EmptyState title="No admin items" copy="Reports will appear here once they are published." />}
          </div>
        </>
      )}
    </section>
  )
}

function MiniItem({ item }) {
  return (
    <article className="mini-item">
      <span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span>
      <h3>{item.itemName}</h3>
      <p>{item.description}</p>
      <small>{item.location}</small>
    </article>
  )
}

function EmptyState({ title, copy }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{copy}</span>
    </div>
  )
}

function readError(err, fallback) {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback
}

export default App
