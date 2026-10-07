import mongoose from "mongoose";

const messageSchema = new Schema({
  conversation: {
     type: Types.ObjectId,
      ref: 'Conversation', 
      required: true
     },
  sender: { 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true 
},
  text: { 
    type: String,
     default: '',
      maxlength: 5000
     },
  deleted: { 
    type: Boolean, 
    default: false
 },

  attachments: [{ url: String, name: String, mime: String, size: Number }],
  

}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema)