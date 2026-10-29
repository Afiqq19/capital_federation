const registerBankRoutes = require('./bank.routes');
const registerOversightRoutes = require('./oversight.routes');

/**
 * Mendaftarkan seluruh route admin yang sudah dipisah per modul.
 * (Route admin lama — overview, users, companies, settings, news, events, logs —
 * masih berada di server.js dan akan dipindahkan bertahap.)
 */
module.exports = function registerAdminRoutes(app, deps) {
  registerBankRoutes(app, deps);
  registerOversightRoutes(app, deps);
};
