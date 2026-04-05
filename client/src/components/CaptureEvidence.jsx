import { useEffect, useMemo, useState } from 'react';
import { uploadActivityPhoto } from '../api/activityApi';

function CaptureEvidence({ token, activeSession }) {
  const [file, setFile] = useState(null);
  const [taskId, setTaskId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [lastUploaded, setLastUploaded] = useState(null);

  const previewUrl = useMemo(() => {
    if (!file) {
      return '';
    }

    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleUpload() {
    if (!file) {
      setFeedback('Debes tomar o seleccionar una foto primero.');
      return;
    }

    if (!activeSession?._id && !taskId.trim()) {
      setFeedback('Debes asociar la foto a una sesión activa o indicar taskId.');
      return;
    }

    setFeedback('');
    setIsUploading(true);

    try {
      const uploaded = await uploadActivityPhoto(token, {
        file,
        taskId: taskId.trim() || undefined,
        workSessionId: activeSession?._id
      });

      setLastUploaded(uploaded);
      setFeedback('Evidencia subida correctamente a Google Drive.');
      setFile(null);
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="panel evidence-panel slide-up">
      <h2>Evidencia Visual</h2>
      <p className="hint">Captura de hallazgos usando la cámara trasera del dispositivo.</p>

      <label className="touch-button camera" htmlFor="photo-input">
        Tomar Foto de Hallazgo
      </label>
      <input
        id="photo-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => setFile(event.target.files?.[0] || null)}
      />

      {previewUrl ? (
        <figure className="preview-box">
          <img src={previewUrl} alt="Vista previa de evidencia" />
        </figure>
      ) : null}

      <label htmlFor="taskId">Task ID (opcional si ya hay sesión activa)</label>
      <input
        id="taskId"
        type="text"
        placeholder="Mongo Task ID"
        value={taskId}
        onChange={(event) => setTaskId(event.target.value)}
      />

      <button type="button" className="cta-button" onClick={handleUpload} disabled={isUploading}>
        {isUploading ? 'Subiendo foto...' : 'Enviar Evidencia'}
      </button>

      {feedback ? <p className="feedback">{feedback}</p> : null}

      {lastUploaded ? (
        <p className="hint">
          Último archivo: <a href={lastUploaded.webViewLink} target="_blank" rel="noreferrer">Abrir en Drive</a>
        </p>
      ) : null}
    </section>
  );
}

export default CaptureEvidence;
