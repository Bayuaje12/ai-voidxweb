(() => {
  const $ = id => document.getElementById(id);
  const messagesEl = $('messages');
  const startBtn = $('startBtn');
  const endBtn = $('endBtn');
  const connectionLabel = $('connectionLabel');
  const sessionBadge = $('sessionBadge');
  const activityText = $('activityText');
  const avatarStage = $('avatarStage');
  const transcriptHint = $('transcriptHint');
  const textInput = $('textInput');
  const sendBtn = $('sendBtn');
  const chatForm = $('chatForm');

  let voiceClient = null;
  let toastTimer = null;
  let busy = false;
  let history = [];
  const HISTORY_KEY = 'xvoid-gemini-history-v2';

  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (Array.isArray(saved)) {
      history = saved.slice(-30);
      history.forEach(item => addMessage(item.role, item.text, false));
      if (history.length) $('welcomeMessage')?.remove();
    }
  } catch {}

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  function saveHistory() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-30))); } catch {}
  }

  function addMessage(role, text, save = true) {
    if (!text?.trim()) return;
    $('welcomeMessage')?.remove();
    const item = document.createElement('div');
    item.className = `message ${role}`;
    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'YOU / INPUT' : 'X-VOID / RESPONSE';
    const content = document.createElement('span');
    content.textContent = text.trim();
    item.append(label, content);
    messagesEl.appendChild(item);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (save) {
      history.push({ role, text: text.trim() });
      history = history.slice(-30);
      saveHistory();
    }
    if (role === 'assistant') {
      window.XVoidExpressions.setExpression(window.XVoidExpressions.inferExpression(text));
    }
  }

  function setStatus(status) {
    const map = {
      listening: ['MICROPHONE ACTIVE', 'LISTENING', 'Gue dengerin. Bicara sekarang...'],
      thinking: ['GEMINI PROCESSING', 'THINKING', 'X-VOID sedang berpikir...'],
      speaking: ['X-VOID SPEAKING', 'SPEAKING', 'X-VOID sedang berbicara...'],
      offline: ['SYSTEM STANDBY', 'OFFLINE', 'Sistem siap menerima pesan.'],
      online: ['NEURAL CORE READY', 'ONLINE', 'Gemini siap menerima pesan.']
    }[status] || ['SYSTEM STANDBY', 'OFFLINE', 'Menunggu input.'];
    connectionLabel.textContent = map[0];
    sessionBadge.textContent = map[1];
    activityText.textContent = map[2];
    sessionBadge.classList.toggle('online', status === 'online' || status === 'listening' || status === 'speaking');
    startBtn.disabled = status === 'listening' || busy;
    endBtn.disabled = status !== 'listening';
    avatarStage.classList.toggle('is-listening', status === 'listening');
    avatarStage.classList.toggle('is-thinking', status === 'thinking');
    avatarStage.classList.toggle('is-speaking', status === 'speaking');
    if (status === 'offline' || status === 'online') {
      avatarStage.classList.remove('is-listening', 'is-thinking', 'is-speaking');
    }
    $('avatarState').textContent = status === 'listening' ? 'LISTENING' : status === 'speaking' ? 'SPEAKING' : status === 'thinking' ? 'PROCESSING' : 'AWAITING INPUT';
  }

  function chooseIndonesianVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const idVoices = voices.filter(v => /^id(-|_)/i.test(v.lang));
    const preferred = idVoices.find(v => /female|woman|google.*indonesia|indonesia.*female|gadis| perempuan/i.test(v.name));
    return preferred || idVoices[0] || voices.find(v => /^en/i.test(v.lang)) || null;
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.02;
    utterance.pitch = 1.12;
    const voice = chooseIndonesianVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('online');
    utterance.onerror = () => setStatus('online');
    window.speechSynthesis.speak(utterance);
  }

  async function sendMessage(text) {
    const prompt = String(text || '').trim();
    if (!prompt || busy) return;
    addMessage('user', prompt);
    transcriptHint.textContent = `INPUT: ${prompt}`;
    textInput.value = '';
    busy = true;
    sendBtn.disabled = true;
    startBtn.disabled = true;
    setStatus('thinking');
    window.XVoidExpressions.setExpression('neutral');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: history.slice(-12, -1).map(item => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            text: item.text
          }))
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status}).`);
      if (!data.reply) throw new Error('Gemini tidak mengirim jawaban. Coba ulangi.');
      addMessage('assistant', data.reply);
      transcriptHint.textContent = `X-VOID: ${data.reply}`;
      speak(data.reply);
    } catch (error) {
      toast(error.message || 'Gagal menghubungi Gemini.');
      activityText.textContent = error.message || 'Koneksi AI gagal.';
      window.XVoidExpressions.setExpression('sad');
    } finally {
      busy = false;
      sendBtn.disabled = false;
      startBtn.disabled = false;
      if (!window.speechSynthesis?.speaking) setStatus('online');
    }
  }

  startBtn.addEventListener('click', () => {
    if (voiceClient?.listening) return;
    try {
      if (!voiceClient) {
        voiceClient = new window.XVoidRealtime({
          onStatus: setStatus,
          onTranscript: text => sendMessage(text),
          onError: error => { toast(error.message); setStatus('offline'); }
        });
      }
      voiceClient.start();
    } catch (error) {
      toast(error.message);
      activityText.textContent = error.message;
    }
  });

  endBtn.addEventListener('click', () => {
    voiceClient?.stop();
    voiceClient = null;
    setStatus('online');
  });

  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(textInput.value);
  });

  $('clearBtn').addEventListener('click', () => {
    history = [];
    saveHistory();
    messagesEl.innerHTML = '';
    const fresh = document.createElement('div');
    fresh.className = 'welcome-message';
    fresh.id = 'welcomeMessage';
    fresh.innerHTML = '<div class="welcome-symbol">⌁</div><h3>Riwayat dibersihkan.</h3><p>Obrolan baru siap dimulai. Riwayat tersimpan lokal di browser lu.</p>';
    messagesEl.appendChild(fresh);
    transcriptHint.textContent = 'TRANSKRIP AKAN MUNCUL DI SINI';
    window.speechSynthesis?.cancel();
    window.XVoidExpressions.setExpression('neutral');
    setStatus('online');
  });

  document.querySelectorAll('.suggestion').forEach(button => {
    button.addEventListener('click', () => sendMessage(button.dataset.prompt));
  });

  window.speechSynthesis?.getVoices?.();
  if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  setStatus('online');
})();