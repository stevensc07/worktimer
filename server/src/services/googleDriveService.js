const { google } = require('googleapis');
const { Readable } = require('stream');
const path = require('path');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const DRIVE_SCOPE = ['https://www.googleapis.com/auth/drive'];

let cachedDriveClient = null;

function resolveAuthOptions() {
  if (env.googleServiceAccountJson) {
    let parsedCredentials;

    try {
      parsedCredentials = JSON.parse(env.googleServiceAccountJson);
    } catch (error) {
      throw new ApiError(500, 'GOOGLE_SERVICE_ACCOUNT_JSON tiene un formato inválido.');
    }

    return {
      credentials: parsedCredentials,
      scopes: DRIVE_SCOPE
    };
  }

  if (env.googleServiceAccountKeyPath) {
    const serverRoot = path.resolve(__dirname, '../..');
    const keyFile = path.isAbsolute(env.googleServiceAccountKeyPath)
      ? env.googleServiceAccountKeyPath
      : path.resolve(serverRoot, env.googleServiceAccountKeyPath);

    return {
      keyFile,
      scopes: DRIVE_SCOPE
    };
  }

  throw new ApiError(
    500,
    'No existe configuración de credenciales de Google Drive (JSON o key path).'
  );
}

function getDriveClient() {
  if (cachedDriveClient) {
    return cachedDriveClient;
  }

  const auth = new google.auth.GoogleAuth(resolveAuthOptions());
  cachedDriveClient = google.drive({ version: 'v3', auth });
  return cachedDriveClient;
}

/**
 * Sube una imagen a Google Drive.
 * @param {Buffer} imageBuffer - Binario de la imagen.
 * @param {{fileName: string, mimeType: string, folderId?: string}} options
 * @returns {Promise<{fileId: string, webViewLink: string, webContentLink: string}>}
 */
async function uploadToDrive(imageBuffer, options) {
  const folderId = options.folderId || env.googleDriveFolderId;

  if (!folderId) {
    throw new ApiError(500, 'Falta GOOGLE_DRIVE_FOLDER_ID para subir evidencias.');
  }

  try {
    const drive = getDriveClient();

    const createResponse = await drive.files.create({
      requestBody: {
        name: options.fileName,
        parents: [folderId]
      },
      supportsAllDrives: true,
      media: {
        mimeType: options.mimeType,
        body: Readable.from(imageBuffer)
      },
      fields: 'id,webViewLink,webContentLink'
    });

    const fileId = createResponse.data.id;

    if (!fileId) {
      throw new ApiError(502, 'No fue posible obtener el ID del archivo en Drive.');
    }

    if (env.googleDriveSharePublic) {
      try {
        await drive.permissions.create({
          fileId,
          supportsAllDrives: true,
          requestBody: {
            type: 'anyone',
            role: 'reader'
          }
        });
      } catch (permissionError) {
        logger.warn('No se pudo asignar permiso público al archivo de Drive', {
          fileId,
          message: permissionError.message,
          responseData: permissionError.response?.data
        });
      }
    }

    const metadataResponse = await drive.files.get({
      fileId,
      supportsAllDrives: true,
      fields: 'id,webViewLink,webContentLink'
    });

    return {
      fileId,
      webViewLink: metadataResponse.data.webViewLink,
      webContentLink: metadataResponse.data.webContentLink
    };
  } catch (error) {
    const driveReason = error.response?.data?.error?.errors?.[0]?.reason;

    logger.error('Error subiendo archivo a Google Drive', {
      message: error.message,
      reason: driveReason,
      responseData: error.response?.data
    });

    if (error instanceof ApiError) {
      throw error;
    }

    if (driveReason === 'storageQuotaExceeded') {
      throw new ApiError(
        502,
        'La Service Account no puede guardar en My Drive sin cuota. Usa una carpeta dentro de Shared Drive y comparte acceso a la Service Account.'
      );
    }

    throw new ApiError(
      502,
      'No se pudo subir la evidencia a Google Drive. Intenta nuevamente en unos minutos.'
    );
  }
}

module.exports = {
  uploadToDrive
};
