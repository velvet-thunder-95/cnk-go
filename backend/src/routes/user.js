import { Router } from "express";
import { updateProfile, getProfile, deleteProfile } from "../controllers/user.js";
import { userAuthMiddleware } from "../middleware/userAuthMiddleware.js";

const router = Router();

/**
 * @route PATCH /update-profile
 * @access Private
 * @description Updates the user's profile information such as first name, last name etc.
 */
router.patch( '/update-profile', userAuthMiddleware, updateProfile );

/**
 * @route GET /get-profile
 * @access Private
 * @description Retrieves the authenticated user's profile information
 */
router.get( '/get-profile', userAuthMiddleware, getProfile );

/**
 * @route DELETE /delete-account
 * @access Private
 * @description Deletes the authenticated user's account permanently
 */
router.delete( '/delete-account', userAuthMiddleware, deleteProfile );

export default router;