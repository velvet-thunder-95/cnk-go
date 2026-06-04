import supabase from "../config/supabaseClient.js";
import response from "../utils/response.js";
import { asyncHandler } from "./errorHandler.js";

export const userAuthMiddleware = asyncHandler(async (req , res , next) => {
    if (!req.cookies) {
        return response(res, false, 401, 'No cookies found in request');
    }

    const { access_token: token } = req.cookies;

    if (!token) {
        return response(res, false, 401, 'You are not authenticated! Please log in.');
    }

    const { data , error } = await supabase.auth.getUser(token) ;

    if(error || !data.user ){
        return response(res, false, 401, 'Invalid or expired token. Please log in again.');
    }

    req.user = data.user ;

    next() ;
})