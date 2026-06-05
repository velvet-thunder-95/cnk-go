import { Router } from "express";
import { login, logout, signUp , forgotPassword, changePassword } from "../controllers/auth.js";
import { userAuthMiddleware } from "../middleware/userAuthMiddleware.js";

const router = Router() ;

/**
 * User signup endpoint
 * @route POST /signup
 * @access Public
 * @description Register a new user account
 */
router.post("/signup" , signUp) ;

/**forgotPassword
 * User login endpoint
 * @route POST /login
 * @access Public
 * @description Authenticate user and return access token
 */
router.post("/login" , login) ;

/**
 * User logout endpoint
 * @route POST /logout
 * @access Private
 * @description User logout from the profile
 */
router.post("/logout" , userAuthMiddleware , logout) ;

/**
 * @route POST /change-password
 * @access Private
 * @description Changes the password of the user after verifying the old password
 */

/**
 * @route POST /forgot-password
 * @access Public
 * @description Initiates the password reset process by sending a reset email to the user
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route POST /change-password
 * @access Private
 * @description Changes the user's password after verifying the old password
 */
router.post('/change-password' , userAuthMiddleware , changePassword) ;

export default router ;