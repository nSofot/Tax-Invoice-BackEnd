import express from "express";
import { createUser } from "../controllers/userController.js";
import { loginUsers } from "../controllers/userController.js";
import { getUsers } from "../controllers/userController.js";
import { getUser } from "../controllers/userController.js";
import { updateUser } from "../controllers/userController.js";
import { deleteUser } from "../controllers/userController.js";
import { resetPassword } from "../controllers/userController.js";
import { sendOTP } from "../controllers/userController.js";
import { loginWithGoogle} from "../controllers/userController.js";


const userRouter = express.Router();

userRouter.post("/", createUser);
userRouter.post("/login", loginUsers);
userRouter.post("/login-google", loginWithGoogle)
userRouter.get("/users", getUsers);
userRouter.get("/", getUser);
userRouter.put("/:userId", updateUser);
userRouter.delete("/:userId", deleteUser);
userRouter.post("/send-OTP", sendOTP);
userRouter.post("/reset-password", resetPassword);


export default userRouter;