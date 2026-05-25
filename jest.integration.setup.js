const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = async () => {
  // Variáveis do .env já estão carregadas no process.env
};
