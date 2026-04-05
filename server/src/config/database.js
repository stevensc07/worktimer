const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error('Falta MONGO_URI en las variables de entorno.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  logger.info('MongoDB conectado correctamente.');
}

module.exports = connectDatabase;
