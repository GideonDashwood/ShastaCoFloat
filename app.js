// ============ SUPABASE SETUP ============
const SUPABASE_URL = 'https://gezjgeuhmvagdmkindev.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PMvYnAScBWYDYFnChvCYJg_ydRFlrAh';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============ STATE ============
let currentUser = null;
let selectedBoard = { type: null, model: null };
let watchId = null;
let routePoints = [];
let recordMap = null;
let recordPolyline = null;
let startTime = null;
let timerInterval = null;
let topSpeedKmh = 0;
let currentRideId = null;
let modalMapInstance = null;
let allRides = [];

// ============ THEME ============
const savedTheme = localStorage.getItem('rl-theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem('rl-theme', next);
  updateThemeIcon(next);
  // Re-render map tiles if maps are open
  updateMapTiles();
}

function updateThemeIcon(theme) {
  const el = document.getElementById('theme-icon');
  if (el) el.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function getMapTiles() {
  const theme = document.body.getAttribute('data-theme');
  if (theme === 'dark') {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19
    });
  } else {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    });
  }
}

let currentTileLayer = null;
let mapInstances = [];

function updateMapTiles() {
  mapInstances.forEach(map => {
    if (map && map._layers) {
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      getMapTiles().addTo(map);
    }
  });
}

// ============ AUTH ============
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[onclick="showTab('${tab}')"]`).classList.add('active');
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
}

async function signIn() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; return; }
}

async function signUp() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  if (!name) { errEl.textContent = 'Please enter your name.'; return; }
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
  if (error) { errEl.textContent = error.message; return; }
  errEl.style.color = 'var(--accent)';
  errEl.textContent = 'Check your email to confirm your account!';
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
}

supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');
    initApp();
  }
});

// ============ INIT ============
async function initApp() {
  const email = currentUser.email || '';
  const name = currentUser.user_metadata?.full_name || email;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || '?';
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('user-email-display').textContent = email;

  // Set default date for log form
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('log-date').value = now.toISOString().slice(0,16);

  await loadRides();
  loadProfileStats();
}

// ============ NAVIGATION ============
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));

  if (page === 'profile') loadProfileStats();
}

// ============ RIDES LIST ============
async function loadRides() {
  const boardFilter = document.getElementById('filter-board')?.value;
  let query = supabase
    .from('rides')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('started_at', { ascending: false });

  if (boardFilter) query = query.eq('board_type', boardFilter);

  const { data, error } = await query;
  if (error) { console.error(error); return; }
  allRides = data || [];

  renderRidesList(allRides);
  updateStatsBar(allRides);
}

function renderRidesList(rides) {
  const el = document.getElementById('rides-list');
  if (!rides.length) {
    el.innerHTML = '<p class="empty-state">No rides yet. Hit Record to start your first!</p>';
    return;
  }
  el.innerHTML = rides.map(r => {
    const date = new Date(r.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = new Date(r.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dist = (r.distance_km || 0).toFixed(2);
    const dur = formatDuration(r.duration_seconds || 0);
    const top = (r.top_speed_kmh || 0).toFixed(1);
    const boardLabel = r.board_type === 'onewheel' ? `OW ${r.board_model || ''}`.trim() : 'EUC';
    return `
      <div class="ride-card" onclick="openRide('${r.id}')">
        <div class="ride-card-left">
          <div class="ride-title">${escHtml(r.title || 'Untitled Ride')}</div>
          <div class="ride-meta">${date} · ${time}</div>
          <div class="ride-stats">
            <div class="ride-stat-item"><span class="ride-stat-val">${dist}</span><span class="ride-stat-lbl">km</span></div>
            <div class="ride-stat-item"><span class="ride-stat-val">${dur}</span><span class="ride-stat-lbl">time</span></div>
            <div class="ride-stat-item"><span class="ride-stat-val">${top}</span><span class="ride-stat-lbl">top km/h</span></div>
          </div>
        </div>
        <span class="board-badge">${boardLabel}</span>
      </div>`;
  }).join('');
}

function updateStatsBar(rides) {
  const total = rides.length;
  const totalKm = rides.reduce((s, r) => s + (r.distance_km || 0), 0);
  const topSpeed = rides.reduce((s, r) => Math.max(s, r.top_speed_kmh || 0), 0);
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-km').textContent = totalKm.toFixed(1);
  document.getElementById('stat-topspeed').textContent = topSpeed.toFixed(1);
}

// ============ RIDE DETAIL MODAL ============
async function openRide(id) {
  currentRideId = id;
  const ride = allRides.find(r => r.id === id);
  if (!ride) return;

  const modal = document.getElementById('ride-modal');
  modal.classList.add('open');

  // Map
  setTimeout(() => {
    if (modalMapInstance) { modalMapInstance.remove(); mapInstances = mapInstances.filter(m => m !== modalMapInstance); }
    modalMapInstance = L.map('modal-map', { zoomControl: true, scrollWheelZoom: false });
    getMapTiles().addTo(modalMapInstance);
    mapInstances.push(modalMapInstance);

    const route = ride.route || [];
    if (route.length > 1) {
      const latlngs = route.map(p => [p.lat, p.lng]);
      L.polyline(latlngs, { color: '#3ddc84', weight: 4, opacity: 0.9 }).addTo(modalMapInstance);
      modalMapInstance.fitBounds(latlngs);
      L.circleMarker(latlngs[0], { color: '#3ddc84', radius: 6, fillOpacity: 1 }).addTo(modalMapInstance);
      L.circleMarker(latlngs[latlngs.length-1], { color: '#e05555', radius: 6, fillOpacity: 1 }).addTo(modalMapInstance);
    } else {
      modalMapInstance.setView([37.7749, -122.4194], 13);
      if (route.length === 1) modalMapInstance.setView([route[0].lat, route[0].lng], 15);
    }
  }, 100);

  // Content
  const date = new Date(ride.started_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const boardLabel = ride.board_type === 'onewheel' ? `Onewheel ${ride.board_model || ''}`.trim() : 'EUC';
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-content-section">
      <h2 style="font-family:var(--font-mono);font-size:1.1rem;margin-bottom:4px">${escHtml(ride.title || 'Untitled Ride')}</h2>
      <p style="font-size:0.82rem;color:var(--text3);margin-bottom:0.75rem">${date} · <span class="board-badge">${boardLabel}</span></p>
      <div class="modal-stat-row">
        <div class="modal-stat"><span>${(ride.distance_km||0).toFixed(2)}</span><label>km</label></div>
        <div class="modal-stat"><span>${formatDuration(ride.duration_seconds||0)}</span><label>duration</label></div>
        <div class="modal-stat"><span>${(ride.top_speed_kmh||0).toFixed(1)}</span><label>top km/h</label></div>
        <div class="modal-stat"><span>${(ride.avg_speed_kmh||0).toFixed(1)}</span><label>avg km/h</label></div>
      </div>
      ${ride.notes ? `<p style="font-size:0.88rem;color:var(--text2);background:var(--surface);border-radius:var(--radius-sm);padding:0.75rem;border:1px solid var(--border)">${escHtml(ride.notes)}</p>` : ''}
    </div>`;
}

function closeModal(e) {
  if (e.target === document.getElementById('ride-modal')) closeRideModal();
}
function closeRideModal() {
  document.getElementById('ride-modal').classList.remove('open');
  if (modalMapInstance) { modalMapInstance.remove(); mapInstances = mapInstances.filter(m => m !== modalMapInstance); modalMapInstance = null; }
}

async function deleteRide() {
  if (!confirm('Delete this ride? This cannot be undone.')) return;
  const { error } = await supabase.from('rides').delete().eq('id', currentRideId).eq('user_id', currentUser.id);
  if (error) { toast('Error deleting ride'); return; }
  closeRideModal();
  toast('Ride deleted');
  loadRides();
}

async function shareRide() {
  const ride = allRides.find(r => r.id === currentRideId);
  if (!ride) return;
  // Make public if not already
  if (!ride.is_public) {
    await supabase.from('rides').update({ is_public: true }).eq('id', currentRideId);
  }
  const url = `${location.origin}${location.pathname}?ride=${currentRideId}`;
  if (navigator.share) {
    navigator.share({ title: ride.title || 'My Ride', url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => toast('Link copied!')).catch(() => toast('Copy: ' + url));
  }
}

// ============ RECORD PAGE ============
function selectBoard(type, model) {
  selectedBoard = { type, model };
  document.querySelectorAll('.board-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-board="${type}-${model}"]`).classList.add('selected');
  document.getElementById('start-btn').disabled = false;
  document.getElementById('gps-status').textContent = 'GPS ready — tap Start Ride';
}

function startRecording() {
  if (!selectedBoard.type) return;
  if (!navigator.geolocation) {
    document.getElementById('gps-status').textContent = 'GPS not supported on this device';
    return;
  }

  routePoints = [];
  topSpeedKmh = 0;
  startTime = Date.now();

  document.getElementById('pre-ride').style.display = 'none';
  document.getElementById('active-ride').style.display = 'block';

  // Init map
  if (recordMap) { recordMap.remove(); mapInstances = mapInstances.filter(m => m !== recordMap); }
  recordMap = L.map('record-map', { zoomControl: false, attributionControl: false });
  getMapTiles().addTo(recordMap);
  recordMap.setView([0, 0], 15);
  mapInstances.push(recordMap);

  recordPolyline = L.polyline([], { color: '#3ddc84', weight: 5 }).addTo(recordMap);

  // Start timer
  timerInterval = setInterval(updateTimer, 1000);

  // Start GPS
  watchId = navigator.geolocation.watchPosition(
    onGpsUpdate,
    err => { document.getElementById('gps-status').textContent = 'GPS error: ' + err.message; },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function onGpsUpdate(pos) {
  const { latitude: lat, longitude: lng, speed } = pos.coords;
  const point = { lat, lng, ts: Date.now() };
  routePoints.push(point);

  // Speed
  const speedKmh = speed != null ? speed * 3.6 : estimateSpeed();
  if (speedKmh > topSpeedKmh) topSpeedKmh = speedKmh;

  document.getElementById('live-speed').textContent = speedKmh.toFixed(1);
  document.getElementById('live-topspeed').textContent = topSpeedKmh.toFixed(1);
  document.getElementById('live-dist').textContent = calcDistance(routePoints).toFixed(2);

  // Update map
  const latlngs = routePoints.map(p => [p.lat, p.lng]);
  recordPolyline.setLatLngs(latlngs);
  recordMap.setView([lat, lng], 17);
}

function estimateSpeed() {
  if (routePoints.length < 2) return 0;
  const a = routePoints[routePoints.length - 2];
  const b = routePoints[routePoints.length - 1];
  const d = haversine(a.lat, a.lng, b.lat, b.lng);
  const t = (b.ts - a.ts) / 3600000;
  return t > 0 ? d / t : 0;
}

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('live-time').textContent = formatDuration(elapsed);
}

function stopRecording() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  clearInterval(timerInterval);
  openSaveModal();
}

// ============ SAVE MODAL ============
function openSaveModal() {
  const modal = document.getElementById('save-modal');
  document.getElementById('save-title').value = `${selectedBoard.type === 'onewheel' ? 'Onewheel' : 'EUC'} ride`;
  document.getElementById('save-notes').value = '';
  document.getElementById('save-public').checked = false;
  document.getElementById('save-public-text').textContent = 'Private';
  document.getElementById('save-public').onchange = function() {
    document.getElementById('save-public-text').textContent = this.checked ? 'Public (shareable)' : 'Private';
  };
  modal.classList.add('open');
}

async function confirmSave() {
  const title = document.getElementById('save-title').value.trim() || 'Untitled Ride';
  const notes = document.getElementById('save-notes').value.trim();
  const isPublic = document.getElementById('save-public').checked;

  const durationSec = Math.floor((Date.now() - startTime) / 1000);
  const distKm = calcDistance(routePoints);
  const avgSpeed = durationSec > 0 ? distKm / (durationSec / 3600) : 0;

  const { error } = await supabase.from('rides').insert({
    user_id: currentUser.id,
    title,
    notes,
    board_type: selectedBoard.type,
    board_model: selectedBoard.model || null,
    route: routePoints,
    distance_km: parseFloat(distKm.toFixed(3)),
    duration_seconds: durationSec,
    top_speed_kmh: parseFloat(topSpeedKmh.toFixed(2)),
    avg_speed_kmh: parseFloat(avgSpeed.toFixed(2)),
    is_public: isPublic,
    started_at: new Date(startTime).toISOString()
  });

  if (error) { toast('Error saving ride: ' + error.message); return; }

  document.getElementById('save-modal').classList.remove('open');
  resetRecordPage();
  toast('Ride saved! 🎉');
  loadRides();
  showPage('rides');
}

function discardRide() {
  document.getElementById('save-modal').classList.remove('open');
  resetRecordPage();
  toast('Ride discarded');
}

function resetRecordPage() {
  document.getElementById('pre-ride').style.display = 'block';
  document.getElementById('active-ride').style.display = 'none';
  document.querySelectorAll('.board-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('start-btn').disabled = true;
  document.getElementById('gps-status').textContent = 'Select a board to begin';
  selectedBoard = { type: null, model: null };
  if (recordMap) { recordMap.remove(); mapInstances = mapInstances.filter(m => m !== recordMap); recordMap = null; }
}

// ============ LOG RIDE ============
function updateModelOptions() {
  const type = document.getElementById('log-board-type').value;
  const row = document.getElementById('model-row');
  const sel = document.getElementById('log-board-model');
  if (type === 'onewheel') {
    row.style.display = 'block';
    sel.innerHTML = '<option value="GT">GT</option><option value="Pint">Pint</option><option value="XR">XR</option>';
  } else {
    row.style.display = 'none';
  }
}

async function saveLoggedRide() {
  const errEl = document.getElementById('log-error');
  errEl.textContent = '';
  const title = document.getElementById('log-title').value.trim() || 'Untitled Ride';
  const boardType = document.getElementById('log-board-type').value;
  const boardModel = boardType === 'onewheel' ? document.getElementById('log-board-model').value : null;
  const dateVal = document.getElementById('log-date').value;
  const distKm = parseFloat(document.getElementById('log-distance').value) || 0;
  const durMin = parseInt(document.getElementById('log-duration').value) || 0;
  const topSpeed = parseFloat(document.getElementById('log-topspeed').value) || 0;
  const avgSpeed = parseFloat(document.getElementById('log-avgspeed').value) || 0;
  const notes = document.getElementById('log-notes').value.trim();

  const { error } = await supabase.from('rides').insert({
    user_id: currentUser.id,
    title,
    board_type: boardType,
    board_model: boardModel,
    started_at: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString(),
    distance_km: distKm,
    duration_seconds: durMin * 60,
    top_speed_kmh: topSpeed,
    avg_speed_kmh: avgSpeed,
    notes,
    route: [],
    is_public: false
  });

  if (error) { errEl.textContent = error.message; return; }

  // Reset form
  document.getElementById('log-title').value = '';
  document.getElementById('log-distance').value = '';
  document.getElementById('log-duration').value = '';
  document.getElementById('log-topspeed').value = '';
  document.getElementById('log-avgspeed').value = '';
  document.getElementById('log-notes').value = '';

  toast('Ride logged! ✅');
  loadRides();
  showPage('rides');
}

// ============ PROFILE STATS ============
async function loadProfileStats() {
  const { data } = await supabase.from('rides').select('*').eq('user_id', currentUser.id);
  if (!data) return;
  const total = data.length;
  const totalKm = data.reduce((s, r) => s + (r.distance_km || 0), 0);
  const topSpeed = data.reduce((s, r) => Math.max(s, r.top_speed_kmh || 0), 0);
  const totalSec = data.reduce((s, r) => s + (r.duration_seconds || 0), 0);

  document.getElementById('prof-rides').textContent = total;
  document.getElementById('prof-km').textContent = totalKm.toFixed(1);
  document.getElementById('prof-topspeed').textContent = topSpeed.toFixed(1);
  document.getElementById('prof-time').textContent = (totalSec / 3600).toFixed(1);

  // Board breakdown
  const breakdown = {};
  data.forEach(r => {
    const key = r.board_type === 'onewheel' ? `Onewheel ${r.board_model || ''}`.trim() : 'EUC';
    breakdown[key] = (breakdown[key] || 0) + 1;
  });
  const el = document.getElementById('board-breakdown');
  el.innerHTML = Object.entries(breakdown).sort((a,b) => b[1]-a[1]).map(([k,v]) => `
    <div class="board-row">
      <span class="board-row-name">${k}</span>
      <span class="board-row-count">${v} ride${v !== 1 ? 's' : ''}</span>
    </div>`).join('') || '<p style="color:var(--text3);font-size:0.88rem;text-align:center;padding:0.5rem">No rides yet</p>';
}

// ============ HELPERS ============
function calcDistance(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i-1].lat, points[i-1].lng, points[i].lat, points[i].lng);
  }
  return d;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
