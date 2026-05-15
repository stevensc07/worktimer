function speak(text) {
  if (!('speechSynthesis' in window)) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-CO';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function SpeakButton({ text, label = 'Escuchar', className = 'icon-action' }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => speak(text)}
      disabled={!text}
      aria-label={label}
      title={label}
    >
      <span aria-hidden>🔊</span>
      <span>{label}</span>
    </button>
  );
}

export default SpeakButton;
