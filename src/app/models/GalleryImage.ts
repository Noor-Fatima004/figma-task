import { Schema, model, models } from "mongoose";

const GalleryImageSchema = new Schema(
  {
    category: { type: Schema.Types.ObjectId, ref: "GalleryCategory", required: true },
    name: { type: String, default: "" },
    alt: { type: String, default: "" },
    contentType: { type: String, required: true },
    url: { type: String, default: "" },
    publicId: { type: String, default: "", index: true },
    format: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    data: { type: Buffer },
    width: { type: Number, default: 400 },   // display width (px)
    height: { type: Number, default: 300 },
    hash: { type: String, index: true },  // display height (px)
  },
  { timestamps: true }
);

export default models.GalleryImage || model("GalleryImage", GalleryImageSchema);