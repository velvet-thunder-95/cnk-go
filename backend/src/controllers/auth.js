import { isStrongPassword, validateEmail, validatePasswordLength } from "../../services/validate.js";
import { asyncHandler } from '../middleware/errorHandler.js';
import supabase from "../config/supabaseClient.js";
import response from "../utils/response.js";

/**
 * User signup controller
 * @route POST /api/auth/signup
 * @access Public
 * @description Register a new user account 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with signup confirmation
 */
export const signUp = asyncHandler( async (req , res) => {
    const { email , password } = req.body ;

    // now validate the email and password 
    if(!email || !password){
        return response(res, false, 400, 'Email and password are required');
    }

    // validate if the email is correct or not 
    if(!validateEmail(email)){
        return response(res, false, 400, 'Invalid email format');
    }

    // vaidate the password length
    if(!validatePasswordLength(password)){
        return response(res, false, 400, 'Password must be at least 8 characters long');
    }

    // check if the password is strong or not
    if(!isStrongPassword(password)){
        return response(res, false, 400, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    const { data , error } = await supabase.auth.signUp({
        email , password , options : {
            emailRedirectTo : process.env.FRONTEND_URL 
        }
    })

    if (data?.user?.identities?.length === 0) {
        return response(res, false, 409, 'User with this email already exists');
    }

    if (error) {
        return response(res , false , 400 , error.message) ;
    }

    return response(
        res,
        true,
        201,
        'A verification email has been sent to your email address. Please verify your email before logging in.',
        { user_id: data.user }
    );
})

/**
 * User login controller
 * @route POST /api/auth/login
 * @access Public
 * @description Authenticate user and return access token with cookies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with login confirmation and user data
 */
export const login = asyncHandler(async (req,res) => {
    const { email , password } = req.body ;

    if (!email || !password) {
        return response(res, false, 400, 'Email and password are required');
    }

    // validate if the email is correct or not 
    if(!validateEmail(email)){
        return response(res, false, 400, 'Invalid email format');
    }

    const { data , error } = await supabase.auth.signInWithPassword({
        email , password
    })
    if(error){
        return response(res , false , 400 , error.message) ;
    }

    const userId = data.user.id;

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: data.session.expires_in * 1000,
        path: '/',
    };

    res.cookie('access_token' , data.session.access_token , cookieOptions)
    
    return response(res, true, 200, 'User logged in successfully', {
        user_id: userId,
        user: data.user.user_metadata,
        session: {
            expires_in: data.session.expires_in,
            expires_at: data.session.expires_at,
            token_type: data.session.token_type,
        },
    });
})

/**
 * User logout controller
 * @route POST /api/auth/logout
 * @access Private
 * @description Logout user and invalidate tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with logout confirmation
 */
export const logout = asyncHandler (async (_req,res) => {

    await supabase.auth.signOut();
    
    res.clearCookie('access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });

    return response(res, true, 200, 'User logged out successfully');
})

/**
 * Forgot password controller
 * @route POST /api/auth/forgot-password
 * @access Public
 * @description Send password reset email to user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with forgot password confirmation
 */
export const forgotPassword = asyncHandler (async(req , res) =>{
    const { email } = req.body ;

    if (!email) {
        return response(res, false, 400, 'Email is required');
    }

    // validate if the email is correct or not 
    if(!validateEmail(email)){
        return response(res, false, 400, 'Invalid email format');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email , {
        emailRedirectTo : `${process.env.FRONTEND_URL}/reset-password`
    })

    if (error) {
        return response(res, false, 400, error.message);
    }

    return response(res, true, 200, 'Password reset email sent successfully');
})