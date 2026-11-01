class XVoidRealtime {
  constructor({ onStatus = () => {}, onEvent = () => {}, onError = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onEvent = onEvent;
    this.onError = onError;
    this.pc = null;
    this.dc = null;
    this.stream = null;
    this.audio = null;
    this.connected = false;
    this.stopping = false;
  }

  async start() {
    if (this.connected) return;
    this.stopping = false;
    this.onStatus('connecting');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung akses mikrofon. Gunakan Chrome terbaru melalui HTTPS.');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const tokenResponse = await fetch('/api/realtime/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok) throw new Error(tokenData.error || `Gagal membuat sesi (${tokenResponse.status}).`);

      this.pc = new RTCPeerConnection();
      this.audio = document.createElement('audio');
      this.audio.autoplay = true;
      this.audio.playsInline = true;
      this.audio.style.display = 'none';
      document.body.appendChild(this.audio);
      this.pc.ontrack = event => {
        this.audio.srcObject = event.streams[0];
        this.audio.play().catch(() => this.onEvent({ type: 'playback_blocked' }));
      };
      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        if (state === 'connected') { this.connected = true; this.onStatus('connected'); }
        if (['failed', 'disconnected'].includes(state) && !this.stopping) this.onStatus(state);
      };
      this.stream.getTracks().forEach(track => this.pc.addTrack(track, this.stream));
      this.dc = this.pc.createDataChannel('oai-events');
      this.dc.onopen = () => this.onEvent({ type: 'channel.open' });
      this.dc.onmessage = event => {
        try { this.onEvent(JSON.parse(event.data)); }
        catch { /* Ignore malformed event frames. */ }
      };
      this.dc.onerror = () => this.onError(new Error('Kanal data Realtime mengalami gangguan.'));

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${tokenData.client_secret}`, 'Content-Type': 'application/sdp' }
      });
      const answer = await sdpResponse.text();
      if (!sdpResponse.ok) throw new Error(`WebRTC OpenAI gagal (${sdpResponse.status}): ${answer.slice(0, 240)}`);
      await this.pc.setRemoteDescription({ type: 'answer', sdp: answer });
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  sendEvent(event) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(event));
  }

  async stop() {
    this.stopping = true;
    this.connected = false;
    try { this.dc?.close(); } catch {}
    try { this.pc?.close(); } catch {}
    this.stream?.getTracks().forEach(track => track.stop());
    this.audio?.pause();
    this.audio?.remove();
    this.dc = null; this.pc = null; this.stream = null; this.audio = null;
    this.onStatus('offline');
  }
}
window.XVoidRealtime = XVoidRealtime;
