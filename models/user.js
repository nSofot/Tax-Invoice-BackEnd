import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: { 
        type: String,  
        unique: true 
    },   
    firstname: { 
        type: String, 
        required: true 
    },
    lastname: { 
        type: String, 
        required: true 
    },
    mobile: { 
        type: String,  
        unique: true
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        required: true,
        enum: ['admin', 'manager', 'accountant', 'cashier', 'pumpman', 'user']
    },
    isActive: { 
        type: Boolean, 
        required: true, 
        default: true
    },
    image: { 
        type: String,  
    },
    dateOfBirth: { 
        type: Date,  
    },
}, { timestamps: true });


const User = mongoose.model("User", userSchema);

export default User;