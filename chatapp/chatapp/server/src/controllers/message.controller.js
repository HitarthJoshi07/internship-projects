import  User  from "../models/user.model";
import Message from "../models/message.modal"


export async function getUsersForSidebar(req, res) {
    try {
        const loggedInUserId = req.user._id;

        const filteredUsers = await Users.find({ _id: { $ne: loggedInUserId } }).select("-clerkId");

        res.status(200).json(filteredUsers);

    } catch (error) {
        console.error("Error in getUserForSLidebar", error.message)
        res.status(500).json({ message: "internal server error" })
    }
}

export async function getConversationsFOrSidebar() {
    try {
        const loggedInUserId = req.user._id;
        const conversations = await MessageChannel.aggregate([
            {
                $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }] }
            },
            {
                $group: {
                    _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
                    lastMessageAt: { $max: "$createdAt" }
                },
            },
            //most recent converstation at the top 
            {
                $sort: { lastMessageAt: -1 }
            },
            {
                $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" }
            },
            {
                $replaceRoot: { newRoot: { $first: "$user" } }
            },
            { $project: { clerkId: 0 } }
        ]);
    } catch (error) {
        console.error("Error in getConversationForSidebar", error.message)
        res.status(500).json({ message: "internal server error" })
    }
}

export async function getMessages(req, res) {
    try {
        const { id: userToChatId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                {senderId: myId, reciverId: userToChatId},
                {senderId: userToChatId, reciverId: userToChatId}
            ]
        }).sort({createdAt:1})

        res,json(message)
        
    } catch (error) {

    }
}