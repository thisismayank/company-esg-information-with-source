import mongoose from "mongoose";


const UserSchema = new mongoose.Schema(
    {
        avatar: {
            type: String,
            trim: true,
            default: null
        },
        firstName: {
            type: String,
            trim: true,
            required: true
        },
        lastName: {
            type: String,
            trim: true,
            default: ""
        },
        email: {
            type: String,
            trim: true,
            unique: true,
            required: true
        }
    },
    {
        timestamps: true,
        versionKey: false,
        minimize: false
    }
);

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
