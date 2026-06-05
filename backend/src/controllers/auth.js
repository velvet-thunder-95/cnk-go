import { validateDateOfBirth, validateEmail } from "../utils/validate.js";
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
export const signUp = asyncHandler( async ( req, res ) => {
    const { email, password, firstName, lastName, nationality, dateOfBirth } = req.body;

    // now validate the email and password 
    if ( !email || !password ) {
        return response( res, false, 400, 'Email and password are required' );
    }

    // validate if the email is correct or not 
    if ( !validateEmail( email ) ) {
        return response( res, false, 400, 'Invalid email format' );
    }

    if ( dateOfBirth && !validateDateOfBirth( dateOfBirth ) ) {
        return response( res, false, 400, 'Invalid date of birth. Please provide a valid date.' );
    }

    const { error } = await supabase.auth.signUp( {
        email, password, options : {
            data : {
                first_name : firstName,
                last_name : lastName,
                nationality : nationality,
                date_of_birth : dateOfBirth,
            }
        }
    } )

    if ( error ) {
        return response( res, false, 400, error.message );
    }

    return response(
        res,
        true,
        201,
        'A verification email has been sent to your email address. Please verify your email before logging in.',
    );
} )

/**
 * User login controller
 * @route POST /api/auth/login
 * @access Public
 * @description Authenticate user and return access token with cookies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with login confirmation and user data
 */
export const login = asyncHandler( async ( req, res ) => {
    const { email, password } = req.body;

    if ( !email || !password ) {
        return response( res, false, 400, 'Email and password are required' );
    }

    // validate if the email is correct or not 
    if ( !validateEmail( email ) ) {
        return response( res, false, 400, 'Invalid email format' );
    }

    const { data, error } = await supabase.auth.signInWithPassword( {
        email, password
    } )
    if ( error ) {
        return response( res, false, 400, error.message );
    }

    const userId = data.user.id;

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: data.session.expires_in * 1000,
        path: '/',
    };

    res.cookie( 'access_token', data.session.access_token, cookieOptions )
    
    return response( res, true, 200, 'User logged in successfully', {
        user_id: userId,
        user: data.user.user_metadata
    } );
} )

/**
 * User logout controller
 * @route POST /api/auth/logout
 * @access Private
 * @description Logout user and invalidate tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with logout confirmation
 */
export const logout = asyncHandler ( async ( _req, res ) => {

    await supabase.auth.signOut();
    
    res.clearCookie( 'access_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    } );

    return response( res, true, 200, 'User logged out successfully' );
} )
/**
 * Change password controller
 * @route POST /api/auth/change-password
 * @access Private
 * @description Verifies old password then updates to new password for authenticated user
 * @param {Object} req - Express request object
 * @param {string} req.body.oldPassword - User's current password
 * @param {string} req.body.newPassword - User's new password
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with password change confirmation
 */
export const changePassword = asyncHandler ( async( req, res ) =>{
    const { oldPassword, newPassword } = req.body;
    const email = req.user.email;

    if ( !email ) {
        return response( res, false, 400, 'login first to change your password' );
    }
    if ( !oldPassword || !newPassword ) {
        return response( res, false, 400, 'Old password and new password are required' );
    }

    const { error } = await supabase.auth.signInWithPassword( {
        email,
        password : oldPassword
    } )

    if ( error ) {
        return response( res, false, 400, 'Old password is incorrect' );
    }

    const { error : updateError } = await supabase.auth.admin.updateUserById( req.user.id, {
        password : newPassword
    } )

    if ( updateError ) {
        return response( res, false, 400, updateError.message );
    }

    return response( res, true, 200, 'Password reset successfully' );
} )
