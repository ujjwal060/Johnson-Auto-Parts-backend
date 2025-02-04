import jwt from 'jsonwebtoken';
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { generateOTP, sendEmail, generateResetToken } from '../utills/generateOtp';

interface AuthRequest extends Request {
    user?: { userId: string; email: string };
}

const signUp = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { email, mobile, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists",
                status: 400
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            mobile,
            password: hashedPassword,
        });

        await newUser.save();

        return res.status(200).json({
            message: "User registered successfully",
            status: 200
        });

    } catch (error) {
        return res.status(500).json({
            messages: error,
            status: 500
        });
    }
}

const login = async (req: Request, res: Response): Promise<Response> => {
    try {
        const jwtAccess: any = process.env.JWT_ACCESS_SECRET || 'your-access-secret';
        const jwtRef: any = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "User not found",
                status: 400,
            });
        };

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Invalid credentials",
                status: 400,
            });
        };

        const accessToken = jwt.sign(
            { userId: user.userId, email: user.email },
            jwtAccess,
            { expiresIn: '1h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.userId, email: user.email },
            jwtRef,
            { expiresIn: '30d' }
        );

        user.refreshToken = refreshToken;
        await user.save();

        return res.status(200).json({
            message: "Login successful",
            data: {
                userId: user.userId,
                accessToken,
                refreshToken,
            },
            status: 200,
        });

    } catch (error) {
        return res.status(500).json({
            messages: error,
            status: 500
        });
    }
}

const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({
            message: "User not found",
            status: 400
        });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendEmail(user.email, "Password Reset OTP", `Your OTP is: ${otp}. It is valid for 10 minutes.`);

        return res.json({
            message: "OTP sent to email",
            status: 200
        });

    } catch (error) {
        return res.status(500).json({
            messages: error,
            status: 500
        });
    }
}

const verifyOtp = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;
        const userData = await User.findOne({ email });

        if (!userData || userData.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP. Please use valid OTP.",
                status: 400
            });
        }
        if (!userData || new Date() > new Date(userData.otpExpiry!)) {
            return res.status(400).json({
                message: "Your OTP has expired.",
                status: 400
            });
        }

        userData.otp = undefined;
        userData.otpExpiry = undefined;
        await userData.save();

        const resetToken = generateResetToken(userData.userId);
        return res.status(200).json({
            message: "OTP verified successfully",
            status: 200,
            resetToken: resetToken
        })

    } catch (error) {
        return res.status(500).json({
            messages: error,
            status: 500
        });
    }
}

const restPassword = async (req: AuthRequest, res: Response) => {
    try {
        const { newPassword } = req.body;
        const userId = req.user;
        const userData = await User.findOne({ userId });

        if (!userData) {
            return res.status(404).json({
                message: "User not found",
                status: 404
            });
        }

        userData.password = await bcrypt.hash(newPassword, 10);
        await userData.save();

        return res.status(200).json({
            messages: "Password reset successful",
            status: 200
        })

    } catch (error) {
        return res.status(500).json({
            messages: error,
            status: 500
        });
    }
}

export {
    signUp,
    login,
    forgotPassword,
    verifyOtp,
    restPassword
};