import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken"
import { JWT_USER_PASS } from "../config.js";

const prismaClient = new PrismaClient() 

export const userRouter = Router()

userRouter.post("/signup", async(req, res) => {
    const { username, password, name } = req.body // heir is the zod validation 

    try {
        await prismaClient.merchant.create({
            data: {
                username,
                password,
                name
            }
        })

        res.json({
            message: "Signed up"
        })

    } catch (e) {
        return res.status(403).json({ message: "Eroorr whilw siging up " })
    }
})

userRouter.post("/signin", async(req, res) => {
     const { username, password } = req.body 
    
            const user = await prismaClient.user.findFirst({
                where: {
                    username,
                    password
                }
            })
            if(!user){
                return res.status(403).json({
                    message: "Unable to log you in"
                })   
            }
    
            const token = jwt.sign({
                id: user.id,
            }, JWT_USER_PASS)
    
            return res.json({
                token 
            })
})