const app = require('./app');
const env = require('./config/env');
const connectDatabase = require('./config/database');
const logger = require('./utils/logger');
const { enforceDailyCutoff } = require('./services/timeControlService');

async function bootstrap() {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      logger.info(`Servidor escuchando en puerto ${env.port}`);
    });

    setInterval(() => {
      enforceDailyCutoff({ force: true }).catch((error) => {
        logger.error('No fue posible aplicar el corte automático.', { message: error.message });
      });
    }, 60 * 1000);
  } catch (error) {
    logger.error('No fue posible iniciar el servidor.', { message: error.message });
    process.exit(1);
  }
}

bootstrap();
