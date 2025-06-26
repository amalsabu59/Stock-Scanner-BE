const express = require('express');
const router = express.Router();
const symbolController = require('../controllers/symbols.controller');

router.get('/symbols', symbolController.getSymbols);

module.exports = router;
