const EXPRESSION_LABELS = {
  neutral: 'NEUTRAL', angry: 'ANGRY', happy: 'HAPPY', smirk: 'SMIRK',
  surprised: 'SURPRISED', sad: 'SAD', playful: 'PLAYFUL', sleepy: 'SLEEPY'
};
function setExpression(expression = 'neutral') {
  const safe = Object.hasOwn(EXPRESSION_LABELS, expression) ? expression : 'neutral';
  const avatar = document.getElementById('avatar');
  const mood = document.getElementById('moodLabel');
  if (avatar) {
    avatar.dataset.expression = safe;
    avatar.setAttribute('aria-label', `Karakter X-VOID berekspresi ${safe}`);
  }
  if (mood) mood.textContent = EXPRESSION_LABELS[safe];
}
function inferExpression(text = '', role = 'assistant') {
  if (role === 'user') return 'neutral';
  const value = text.toLowerCase();
  if (/wkwk|haha|lucu|senang|mantap|keren|😂|😆|🤣/.test(value)) return 'happy';
  if (/serius\\?|hah\\?|masa\\?|benarkah|wow|anjir|astaga/.test(value)) return 'surprised';
  if (/maaf|sedih|kecewa|sayang sekali|turut berduka/.test(value)) return 'sad';
  if (/kesal|marah|nyebelin|bodoh banget|brengsek/.test(value)) return 'angry';
  if (/cie|menggoda|godain|modus|gombal/.test(value)) return 'playful';
  if (/tidur|ngantuk|lelah|capek banget/.test(value)) return 'sleepy';
  if (/yaelah|tentu saja|jelas|hadeh|duh|seriously/.test(value)) return 'smirk';
  return 'neutral';
}
window.XVoidExpressions = { setExpression, inferExpression };