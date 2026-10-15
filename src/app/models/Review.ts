import mongoose, { Schema, Model, models, model } from "mongoose";

export type ReviewStatus = "pending" | "approved";

export interface IReview {
  name: string;
  email: string;
  productName: string;
  productId?: string; // jis product par review diya gaya
  userId?: string; // review dene wale user ki id
  rating: number; // 1-5
  review: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    productName: { type: String, required: true, trim: true, maxlength: 120 },
    productId: { type: String, index: true },
    userId: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true, trim: true, maxlength: 1000 },
    // Website se aaya review pehle "pending" rehta hai, admin approve kare to site par dikhta hai
    status: {
      type: String,
      enum: ["pending", "approved"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Ek user, ek product, ek review (duplicate check tez rahe)
ReviewSchema.index({ email: 1, productId: 1 });

const Review: Model<IReview> =
  (models.Review as Model<IReview>) || model<IReview>("Review", ReviewSchema);

export default Review;