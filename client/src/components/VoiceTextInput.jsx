import { useEffect, useRef, useState } from 'react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeSpeechText(baseText, speechText) {
  const cleanBase = String(baseText || '').trim();
  const cleanSpeech = String(speechText || '').trim();

  if (!cleanSpeech) {
    return cleanBase;
  }

  return cleanBase ? `${cleanBase} ${cleanSpeech}` : cleanSpeech;
}

function VoiceTextInput({
  id,
  label,
  value,
  onChange,
  onVoiceCapture,
  placeholder,
  rows = 3,
  disabled = false
}) {
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');

  const SpeechRecognition = getSpeechRecognition();
  const canUseVoice = Boolean(SpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
    };
  }, []);

  function stopListening() {
    recognitionRef.current?.stop?.();
    setIsListening(false);
  }

  function startListening() {
    if (!canUseVoice || disabled) {
      setVoiceMessage('Este navegador no permite dictado de voz.');
      return;
    }

    recognitionRef.current?.abort?.();
    baseTextRef.current = value;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-CO';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMessage('Grabando voz...');
    };

    recognition.onresult = (event) => {
      let speechText = '';

      for (let index = 0; index < event.results.length; index += 1) {
        speechText += event.results[index][0].transcript;
      }

      onChange(normalizeSpeechText(baseTextRef.current, speechText));
      onVoiceCapture?.();
    };

    recognition.onerror = (event) => {
      setVoiceMessage(event.error === 'not-allowed'
        ? 'Permite el micrófono para dictar.'
        : 'No se pudo tomar la voz.');
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceMessage((current) => (current === 'Grabando voz...' ? 'Voz transcrita.' : current));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div className="voice-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />

      <div className="voice-controls">
        <button
          type="button"
          className={`voice-button ${isListening ? 'recording' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={disabled || !canUseVoice}
          aria-pressed={isListening}
        >
          <span aria-hidden>{isListening ? '■' : '🎤'}</span>
          <span>{isListening ? 'Parar voz' : 'Hablar'}</span>
        </button>
        {voiceMessage ? <p className="voice-message" aria-live="polite">{voiceMessage}</p> : null}
      </div>
    </div>
  );
}

export default VoiceTextInput;
