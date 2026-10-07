import express from "express";
import { userRouter } from "./router/user"
import { merchantRouter } from "./router/merchant"

const app = express();

app.use("/api/v1/user", userRouter)
app.use("/api/v1/user", merchantRouter)

app.get("/", (req, res) => {
    res.send("hoi theire ")
})