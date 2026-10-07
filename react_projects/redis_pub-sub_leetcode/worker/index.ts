import { createClient } from "redis";
import fs from "fs"
import { spawn } from "child_process";

const client = createClient()
 client.connect()
        .then( async () => {
            while(1){
                const response = await client.rPop("problems")
                if(!response ){
                    await new Promise((r) => setTimeout(r, 1000));
                    continue;
                }

                const parsedRsponse = JSON.parse(response);
                const code = parsedRsponse.code;
                const language = parsedRsponse.language;
                console.log("processing question for the user" + parsedRsponse.userId)
                if(language === "Cpp"){
                    console.log("runnig cpp code for now ")
                    await new Promise((r) => setTimeout(r, 10000));
                }
                 
                if(language === "java"){
                    const filePath = __dirname + "/code/a.js";
                    console.log("runnig java code for now ")
                    fs.writeFileSync( filePath, code);
                    const response = spawn("node", [filePath])
                    response.stdout.on("data", (chunk) ={
                        console.log(chunk)
                    })
                    await new Promise((r) => setTimeout(r, 3000));
                }
                

                //update the status in the db 

            }   
        })