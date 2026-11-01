(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  class XVoidRealtime {
    constructor({ onStatus = () => {}, onTranscript = () => {}, onError = () => {}, onSpeaking = () => {} } = {}) {
      this.onStatus = onStatus;
      this.onTranscript = onTranscript;
      this.onError = onError;
      this.onSpeaking = onSpeaking;
      this.recognition = null;
      this.listening = false;
      this.speaking = false;
      this.stopping = false;
    }

    start() {
      if (!SpeechRecognition) {
        throw new Error('Speech Recognition tidak didukung browser ini. Coba Chrome Android terbaru.');
      }
      if (this.listening) return;
      this.stopping = false;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'id-ID';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;
      this.recognition.onstart = () => {
        this.listening = true;
        this.onStatus('listening');
      };
      this.recognition.onresult = event => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) this.onTranscript(transcript);
      };
      this.recognition.onerror = event => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.onError(new Error('Izin mikrofon ditolak. Aktifkan izin mikrofon di Chrome.'));
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          this.onError(new Error(`Mikrofon: ${event.error}`));
        }
      };
      this.recognition.onend = () => {
        this.listening = false;
        if (!this.stopping) this.onStatus('offline');
      };
      this.recognition.start();
    }

    stop() {
      this.stopping = true;
      this.listening = false;
      try { this.recognition?.stop(); } catch {}
      this.recognition = null;
      this.onStatus('offline');
    }
  }

  window.XVoidRealtime = XVoidRealtime;
})();