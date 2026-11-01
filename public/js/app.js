(() => {
  const $ = id => document.getElementById(id);
  const messages = $('messages');
  const welcome = $('welcomeMessage');
  const startBtn = $('startBtn');
  const endBtn = $('endBtn');
  const connectionLabel = $('connectionLabel');
  const sessionBadge = $('sessionBadge');
  const activityText = $('activityText');
  const avatarStage = $('avatarStage');
  const transcriptHint = $('transcriptHint');
  let client = null;
  let toastTimer;
  let pendingUserText = '';
  let pendingAssistantText = '';

  function toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
  }
  function addMessage(role, text) {
    if (!text?.trim()) return;
    welcome?.remove();
    const item = document.createElement('div');
    item.className = `message ${role}`;
    const label = document.createElement('span'); label.className = 'message-label';
    label.textContent = role === 'user' ? 'YOU / INPUT' : 'X-VOID / RESPONSE';
    const content = document.createElement('span'); content.textContent = text.trim();
    item.append(label, content); messages.appendChild(item); messages.scrollTop = messages.scrollHeight;
    if (role === 'assistant') window.XVoidExpressions.setExpression(window.XVoidExpressions.inferExpression(text));
  }
  function setStatus(status) {
    const map = {
      connecting: ['CONNECTING...', 'LINKING', 'Menghubungkan WebRTC...'],
      connected: ['NEURAL LINK ACTIVE', 'ONLINE', 'Terhubung. X-VOID siap mendengarkan.'],
      offline: ['SYSTEM STANDBY', 'OFFLINE', 'Sistem siap menerima koneksi.'],
      failed: ['CONNECTION FAILED', 'ERROR', 'Koneksi terputus. Coba mulai lagi.'],
      disconnected: ['CONNECTION LOST', 'RECONNECT', 'Koneksi terputus. Periksa jaringan.']
    }[status] || ['SYSTEM STANDBY', 'OFFLINE', 'Menunggu koneksi.'];
    connectionLabel.textContent = map[0]; sessionBadge.textContent = map[1]; activityText.textContent = map[2];
    sessionBadge.classList.toggle('online', status === 'connected');
    startBtn.disabled = status === 'connecting' || status === 'connected';
    endBtn.disabled = status !== 'connected' && status !== 'connecting';
    if (status === 'offline' || status === 'failed') avatarStage.classList.remove('is-listening', 'is-speaking', 'is-thinking');
  }
  function handleEvent(event) {
    const type = event.type || '';
    if (type === 'input_audio_buffer.speech_started') {
      avatarStage.classList.add('is-listening'); avatarStage.classList.remove('is-speaking', 'is-thinking');
      activityText.textContent = 'Mendengarkan suara lu...'; window.XVoidExpressions.setExpression('neutral');
    }
    if (type === 'input_audio_buffer.speech_stopped') {
      avatarStage.classList.remove('is-listening'); avatarStage.classList.add('is-thinking');
      activityText.textContent = 'Memproses input...';
    }
    if (type === 'response.created') {
      avatarStage.classList.remove('is-thinking', 'is-listening'); avatarStage.classList.add('is-speaking');
      activityText.textContent = 'X-VOID sedang menjawab...';
    }
    if (type === 'response.audio.delta' || type === 'response.output_audio.delta') {
      avatarStage.classList.remove('is-thinking', 'is-listening'); avatarStage.classList.add('is-speaking');
    }
    if (type === 'response.done') {
      avatarStage.classList.remove('is-speaking', 'is-thinking');
      activityText.textContent = 'Menunggu input berikutnya.';
      if (pendingAssistantText.trim()) { addMessage('assistant', pendingAssistantText); pendingAssistantText = ''; }
    }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      const text = event.transcript || '';
      if (text.trim()) { addMessage('user', text); transcriptHint.textContent = `INPUT: ${text}`; }
    }
    if (type === 'response.audio_transcript.done' || type === 'response.output_audio_transcript.done') {
      const text = event.transcript || '';
      if (text.trim()) { pendingAssistantText = text; transcriptHint.textContent = `X-VOID: ${text}`; }
    }
    if (type === 'response.output_item.done' && event.item?.content) {
      const text = event.item.content.map(part => part.transcript || part.text || '').join(' ').trim();
      if (text && !pendingAssistantText) pendingAssistantText = text;
    }
    if (type === 'error') {
      const message = event.error?.message || 'Realtime mengirim error.';
      toast(message); activityText.textContent = message;
    }
    if (type === 'playback_blocked') toast('Ketuk layar sekali untuk mengaktifkan audio balasan.');
  }

  startBtn.addEventListener('click', async () => {
    if (client) return;
    client = new window.XVoidRealtime({ onStatus: setStatus, onEvent: handleEvent, onError: error => toast(error.message) });
    setStatus('connecting');
    try { await client.start(); }
    catch (error) {
      client = null; setStatus('offline');
      const message = error.name === 'NotAllowedError' ? 'Izin mikrofon ditolak. Aktifkan izin mikrofon di Chrome.' : error.message;
      toast(message); activityText.textContent = message;
    }
  });
  endBtn.addEventListener('click', async () => {
    if (client) await client.stop();
    client = null; setStatus('offline'); window.XVoidExpressions.setExpression('sleepy');
    activityText.textContent = 'Sesi diakhiri.';
  });
  $('clearBtn').addEventListener('click', () => {
    messages.innerHTML = '';
    const fresh = document.createElement('div'); fresh.className = 'welcome-message'; fresh.innerHTML = '<div class="welcome-symbol">⌁</div><h3>Riwayat dibersihkan.</h3><p>Mulai sesi baru kapan saja. Gue nggak nyimpen transkrip ini di server.</p>';
    messages.appendChild(fresh); transcriptHint.textContent = 'TRANSKRIP AKAN MUNCUL DI SINI';
    pendingAssistantText = ''; pendingUserText = ''; window.XVoidExpressions.setExpression('neutral');
  });
  document.querySelectorAll('.suggestion').forEach(button => button.addEventListener('click', () => {
    const prompt = button.dataset.prompt;
    if (!client?.connected) return toast('Mulai percakapan suara dulu untuk mengirim pesan.');
    client.sendEvent({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: prompt }] } });
    client.sendEvent({ type: 'response.create' }); addMessage('user', prompt);
  }));
  setStatus('offline');
})();
