import express from "express";
import {
    getConversationForSidebar,
    getMessages,
    getUsersForSidebar,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js"


const router = express.Router();

router.use(protectRoute);

router.get("")