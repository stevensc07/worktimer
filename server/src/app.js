const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const connectDatabase = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    return next(error);
  }
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
