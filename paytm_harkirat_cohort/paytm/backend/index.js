const express = require("express");
const mainRouter = require("./routes/index")
const cors = require("cors")


const app = express();
const port = 3000


app.use(express.json())
app.use(cors({

}))

app.use("/api/v1", mainRouter)



app.get("/", (req,res) => {
    res.send("hello to the express")
})

app.listen(port, () => {
    console.log(`sever is listing onthe port ${ port }`)
})