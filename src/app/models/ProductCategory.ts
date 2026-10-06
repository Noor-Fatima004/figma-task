import {
  InferSchemaType,
  Model,
  Schema,
  models,
  model,
} from "mongoose";

const ProductCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", maxlength: 10000 },
    // parent category (null = main category)
    parent: { type: Schema.Types.ObjectId, ref: "ProductCategory", default: null },
    // gallery image ids
    image: { type: Schema.Types.ObjectId, ref: "GalleryImage", default: null },
    icon: { type: Schema.Types.ObjectId, ref: "GalleryImage", default: null },
  },
  { timestamps: true }
);

// Same parent ke andar same naam nahi (alag parents me ho sakta hai)
ProductCategorySchema.index(
  { name: 1, parent: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
ProductCategorySchema.index({ slug: 1 }, { unique: true });

type ProductCategoryDoc = InferSchemaType<typeof ProductCategorySchema>;

const ProductCategory: Model<ProductCategoryDoc> =
  (models.ProductCategory as Model<ProductCategoryDoc>) ||
  model<ProductCategoryDoc>("ProductCategory", ProductCategorySchema);

export default ProductCategory;