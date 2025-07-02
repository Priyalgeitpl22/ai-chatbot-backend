import { Router } from "express";
import { register, verifyOtp, resetPassword, changePassword, login, logout, activateAccount, forgetPassword, resendOtp } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp",resendOtp);
router.post("/reset-password", resetPassword);
router.post("/forget-password", forgetPassword);
router.post("/change-password", authMiddleware, changePassword);
router.post("/login", login);
router.post("/logout", logout);
router.post("/activate", activateAccount);

export default router;
