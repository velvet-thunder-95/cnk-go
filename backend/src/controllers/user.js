import { validateDateOfBirth } from "../utils/validate.js";
import { asyncHandler } from '../middleware/errorHandler.js';
import supabase from "../config/supabaseClient.js";
import response from "../utils/response.js";

/**
 * Get profile controller
 * @route GET /api/auth/profile
 * @access Private
 * @description Retrieves authenticated user's profile details from user_metadata
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user profile data
 */
export const getProfile = asyncHandler (async(req , res) => {
    if (!req.user) {
        return response(res, false, 401, 'Login first to get your profile');
    }

    return response(res, true, 200, 'User profile retrieved successfully', {
        user: req.user.user_metadata
    });
})

/**
 * Update profile controller
 * @route PATCH /api/auth/update-profile
 * @access Private
 * @description Updates authenticated user's profile details in user_metadata
 * @param {Object} req - Express request object
 * @param {string} [req.body.firstName] - User's first name
 * @param {string} [req.body.lastName] - User's last name
 * @param {string} [req.body.nationality] - User's nationality
 * @param {string} [req.body.dateOfBirth] - User's date of birth (YYYY-MM-DD)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with update confirmation
 */
export const updateProfile = asyncHandler (async(req , res) => {
    const { firstName , lastName , nationality , dateOfBirth } = req.body ;

    if (!firstName && !lastName && !nationality && !dateOfBirth) {
        return response(res, false, 400, 'Nothing to update. Please provide at least one field.');
    }

    if(dateOfBirth && !validateDateOfBirth(dateOfBirth)){
        return response(res, false, 400, 'Invalid date of birth. Please provide a valid date.');
    }

    const updateData = {};
    if (firstName) updateData.first_name = firstName.trim();
    if (lastName) updateData.last_name = lastName.trim();
    if (nationality) updateData.nationality = nationality.trim();
    if (dateOfBirth) updateData.date_of_birth = dateOfBirth;

    const { error } = await supabase.auth.admin.updateUserById(req.user.id, { user_metadata: updateData })

    if (error) {
        return response(res, false, 400, error.message);
    }

    return response(res, true, 200, 'Profile updated successfully');
})

/**
 * Delete user account controller
 * @route DELETE /api/auth/delete-account
 * @access Private
 * @description Verifies user's password before permanently deleting their account from Supabase
 * @param {Object} req - Express request object
 * @param {string} req.user.email - Authenticated user's email (set by auth middleware)
 * @param {string} req.user.id - Authenticated user's UUID (set by auth middleware)
 * @param {string} req.body.password - User's current password for identity verification
 * @param {Object} res - Express response object
 * @returns {Object} JSON response confirming account deletion
 */
export const deleteProfile = asyncHandler(async( req, res ) =>{
    const email = req.user.email ;
    const password = req.body.password ;
    if(!email){
        return response(res, false, 400, 'login first to delete your account');
    }

    if(!password){
        return response(res, false, 400, 'Password is required to delete your account');
    }

    const { error } = await supabase.auth.signInWithPassword({
        email ,
        password
    })
    
    if(error){
        return response(res, false, 400, 'Password is incorrect');
    }

    const id = req.user.id ;
    const { error : deleteError } = await supabase.auth.admin.deleteUser(id) ;

    if(deleteError){
        return response(res, false, 400, deleteError.message);
    }

    return response(res, true, 200, 'User account deleted successfully');
})