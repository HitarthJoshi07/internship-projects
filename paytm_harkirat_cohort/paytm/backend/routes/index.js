// const { Router } = require("express");
const express = require("express");
const userRouter = require("./user")

const router = express.Router()

router.use("/user", userRouter());

module.export = router;

// /api/v1/user
// /api/v1/transaction