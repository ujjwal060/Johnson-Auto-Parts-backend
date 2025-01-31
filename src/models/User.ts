import mongoose, { Document, Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";

interface IUser extends Document {
  userId: string;
  email: string;
  mobile: string;
  password: string;
  refreshToken:string;
}

const UserSchema = new Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: () => `user-${uuidv4().replace(/-/g, '')}`
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please fill a valid email address'],
    },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    refreshToken:{type:String}
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);