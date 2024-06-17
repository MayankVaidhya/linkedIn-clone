"use server"

import { Post } from "@/models/post.model";
import { IUser } from "@/models/user.model";
import { currentUser } from "@clerk/nextjs/server"
import { v2 as cloudinary } from 'cloudinary';
import connectDB from "./db";
import { revalidatePath } from "next/cache";

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// creating post using server actions
export const createPostAction = async (inputText: string, selectedFile:string) => {
    await connectDB();
    const user = await currentUser();

    if(!user) throw new Error("User not authenticated!");
    if(!inputText) throw new Error("Input field is required!");

    const image = selectedFile;

    const userDatabase : IUser = {
        firstName:user.firstName || "username",
        lastName:user.lastName || "user_name",
        userId:user.id,
        profilePhoto:user.imageUrl
    }

    let uploadResponse;
    try {
        if (image) {
            // 1. create post with image
            uploadResponse = await cloudinary.uploader.upload(image)
            await Post.create({
                description: inputText,
                user:userDatabase,
                imageUrl: uploadResponse?.secure_url
            })
        } else {
            // 2. create post with text only
            await Post.create({
                description: inputText,
                user:userDatabase,
            })
        }
        revalidatePath("/");
    } catch (error:any) {
        throw new Error(error)
        
    }
}

// Get all post using server actions
export const getAllPosts = async () => {
    await connectDB();
    try {
        const posts = await Post.find().sort({createdAt: -1});
        return JSON.parse(JSON.stringify(posts));
        
    } catch (error) {
        console.log(error);
        
    }
}

// delete post by id
export const deletePostAction = async (postId:string) => {
    await connectDB();
    const user = await currentUser();
    if(!user) throw new Error("User not authenticated!");
    const post = await Post.findById(postId);
    if(!post) throw new Error("Post not found!");

    if(post?.user?.userId !== user.id){
        throw new Error("This post is not owned by you!");
    }

    try {
        await Post.deleteOne({_id:postId});
        revalidatePath("/");
    } catch (error:any) {
        throw new Error("An error occurred!");
    }

}