const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let connectionPromise = null;

async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error('Falta MONGO_URI en las variables de entorno.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  mongoose.set('strictQuery', true);

  connectionPromise = mongoose
    .connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    })
    .then((connection) => {
      logger.info('MongoDB conectado correctamente.');
      return connection;
    })
    .catch((error) => {
      logger.error('No fue posible conectar a MongoDB.', { message: error.message });
      throw error;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
}

module.exports = connectDatabase;
