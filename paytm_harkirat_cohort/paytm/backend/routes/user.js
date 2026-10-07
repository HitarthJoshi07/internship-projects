    const express = require("express");
    const zod = require("zod");
    const { User } = require("../db");
    const router = express.Router()
    const jwt = require("jsonwebtoken")
    const JWT_SECRET = require("../config")

    //sigup and signin routesFF

    const signupSchema = zod.object({
        username: zod.string(),
        password: zod.string(),
        firstName: zod.string(),
        lastName: zod.string()
    })

    router.post('/signup', async (req, res) => {
        const body = req.body 
        const obj = signupSchema.safeParse(req.body);
        if(!obj.success){
            res.json({
                message: "Email Already taken./ /Incorrect inputs "
            })
        }

        const user = await User.findOne({
            username: body.username
        })

        if(!user._id){
            res.json({
                message: "Email Already taken./ /Incorrect inputs "
            })
        }

        const dbUser = await User.create(body)
        const token = jwt.sign({
            userId: dbUser._id
        }, JWT_SECRET)

        res.json({
            message: "user creted succesfully ",
            token: token    
        })
    })

    router.post('/signin', (req, res) => {
        const name = req.body.name
        const password = req.body.password
        res.json({
            name: name,
            password: password,
            message: 'hello this si dthe gus with password'
        })
    })


    module.exports = router;
