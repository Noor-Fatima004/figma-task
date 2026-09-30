import { Schema, model, models } from "mongoose";

const GalleryImageSchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: "GalleryCategory", required: true },
    name: { type: String, default: "" },
    alt: { type: String, default: "" },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true },
    width: { type: Number, default: 400 },   // display width (px)
    height: { type: Number, default: 300 },
    hash: { type: String, index: true },  // display height (px)
  },
  { timestamps: true }
);

export default models.GalleryImage || model("GalleryImage", GalleryImageSchema);