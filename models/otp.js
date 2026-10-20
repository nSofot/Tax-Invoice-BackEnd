import mongoose from "mongoose"

const OTPSchema = mongoose.Schema({
    email : {
        type : String,
        default : null
    },
    mobile : {
        type : String,
        default : null
    },
    otp : {
        require : true,
        type : Number
    },
    createdAt : {
        type : Date,
        default : Date.now
    }
})

const OTP = mongoose.model("OTP",OTPSchema)
export default OTP;