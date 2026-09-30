import { Schema, model, models } from "mongoose";

const GalleryCategorySchema = new Schema(
  { name: { type: String, required: true, unique: true, trim: true } },
  { timestamps: true }
);

export default models.GalleryCategory || model("GalleryCategory", GalleryCategorySchema);