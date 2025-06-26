const express = require("express");
const { getSpikes } = require("../controllers/spike.controller");
const router = express.Router();

router.get("/spikes", getSpikes);

module.exports = router;
