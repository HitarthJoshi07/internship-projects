import express from "express";
import { createClient } from "redis"; 

const app = express();
const client = createClient();
await client.connect();

app.use(express.json())

app.post("/submission", (req, res) => {
    const userId = req.body.userId;
    // const questionId = req.body.questionId;  
    const code = req.body.code;
    const language = req.body.language;
    client.lPush("problems", JSON.stringify({userId, code, language}))

    res.json({
        message: "processing..."
    })
})

app.get("/submission/:submissionId", (req, res) => {
   
})


app.listen(3000)