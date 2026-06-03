import supabase from "../config/supabaseClient.js";
import response from "../utils/response.js";

export async function signUp(req , res){
    const { email , password } = req.body ;
    const { data , error } = await supabase.auth.signUp({
        email , password
    })
    if (error) {
        return response(res , false , 400 , error.message) ;
    }

    return response(res , true , 200 , null , {
        user: data.user
    }) ;
}

export async function login(req,res){
    const { email , password } = req.body ;
    const { data , error } = await supabase.auth.signInWithPassword({
        email , password
    })
    if(error){
        return response(res , false , 400 , error.message) ;
    }
    
    return response(res , true , 200 , null , {
        user: data.user
    }) ;
}

export async function logout(_req,res){
    const { error } = await supabase.auth.signOut() ;
    if(error){
        return response(res , false , 400 , error.message) ;
    }
    
    return response(res , true , 200 , "Logged out successfully") ;
}