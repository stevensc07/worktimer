import { useEffect, useId, useRef, useState } from 'react';
import SpeakButton from './SpeakButton';

function InfoHint({ title = 'Informacion', text, align = 'right' }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const hintId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleOutsidePointer(event) {
      if (wrapperRef.current?.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!text) {
    return null;
  }

  function handleToggle(event) {
    event.stopPropagation();
    setIsOpen((current) => !current);
  }

  function handleClose(event) {
    event.stopPropagation();
    setIsOpen(false);
  }

  return (
    <div
      ref={wrapperRef}
      className={`info-hint align-${align} ${isOpen ? 'is-open' : ''}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="info-hint-button"
        aria-label={`Informacion: ${title}`}
        aria-expanded={isOpen}
        aria-controls={hintId}
        onClick={handleToggle}
      >
        i
      </button>

      {isOpen ? (
        <div id={hintId} className="info-hint-popover" role="note">
          <strong>{title}</strong>
          <p>{text}</p>
          <div className="info-hint-actions">
            <SpeakButton
              text={`${title}. ${text}`}
              label="Escuchar"
              className="info-hint-speak"
            />
            <button type="button" className="info-hint-close" onClick={handleClose}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default InfoHint;
