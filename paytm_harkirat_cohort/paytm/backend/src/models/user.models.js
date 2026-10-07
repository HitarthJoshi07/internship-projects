import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
        type: string,
        required: true
    },
    lastName: {
        type: string,
        required: true
    },
    email: {
        type: string,
        required: true
    },
    Password: {
        type: string,
        required: true
    }

})

const User = mongoose.model("User", userSchema)


