const fs = require('fs');
const { AccountingService } = require('./dist/server.cjs');
const { validateCashMovementsReconciliation } = require('./dist/server.cjs') || {}; // wait, how to import?
