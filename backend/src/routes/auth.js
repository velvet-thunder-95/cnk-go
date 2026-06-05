import { Router } from "express";
import { login, logout, signUp , forgotPassword, changePassword, updateProfile, getProfile, deleteUser } from "../controllers/auth.js";
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

/**
 * @route POST /update-profile
 * @access Private
 * @description Updates the user's profile information such as first name, last name etc.
 */
router.post('/update-profile' , userAuthMiddleware , updateProfile) ;

/**
 * @route GET /get-profile
 * @access Private
 * @description Retrieves the authenticated user's profile information
 */
router.get('/get-profile', userAuthMiddleware, getProfile ) ;

/**
 * @route POST /delete-account
 * @access Private
 * @description Deletes the authenticated user's account permanently
 */
router.post('/delete-account' , userAuthMiddleware ,deleteUser ) ;

export default router ;