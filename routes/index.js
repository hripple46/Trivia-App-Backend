var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.send("3 of 5 Correct");
});

module.exports = router;
