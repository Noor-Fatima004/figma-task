import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import GalleryImage from "@/app/models/GalleryImage";
import Product from "@/app/models/Product";
import ProductBrand from "@/app/models/ProductBrand";
import ProductCategory from "@/app/models/ProductCategory";
import ProductVariation from "@/app/models/ProductVariation";
import Review from "@/app/models/Review";
import User from "@/app/models/User";

export type SafeDeleteEntity =
  | "image"
  | "gallery category"
  | "category"
  | "brand"
  | "unit"
  | "attribute"
  | "variation"
  | "product"
  | "user";

export type UsageCount = { related: string; count: number };

export async function inTransaction<T>(
  operation: (session: ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.connection.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function imageReferencePatterns(id: string, name: string): RegExp[] {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [new RegExp(escapedId, "i")];
  if (name) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push(new RegExp(`(?:^|[/\\\\?&=])${escapedName}(?:$|[?#&])`, "i"));
  }
  return patterns;
}

type CountQuery = {
  session(session: ClientSession): { exec(): Promise<number> };
};

async function count(query: CountQuery, session: ClientSession): Promise<number> {
  return query.session(session).exec();
}

export async function checkUsage(
  entity: SafeDeleteEntity,
  id: string,
  session: ClientSession
): Promise<UsageCount[]> {
  const usages: UsageCount[] = [];
  const add = (related: string, value: number) => {
    if (value > 0) usages.push({ related, count: value });
  };

  switch (entity) {
    case "image": {
      const image = await GalleryImage.findById(id).select("name").session(session);
      const mediaPatterns = imageReferencePatterns(id, image?.name ?? "");
      add(
        "product(s)",
        await count(Product.countDocuments({ media: { $in: mediaPatterns } }), session)
      );
      add(
        "category(ies)",
        await count(
          ProductCategory.countDocuments({ $or: [{ image: id }, { icon: id }] }),
          session
        )
      );
      add("brand(s)", await count(ProductBrand.countDocuments({ image: id }), session));
      add(
        "user(s)",
        await count(User.countDocuments({ image: { $in: mediaPatterns } }), session)
      );
      break;
    }
    case "gallery category":
      add(
        "image(s)",
        await count(GalleryImage.countDocuments({ category: id }), session)
      );
      break;
    case "category":
      add(
        "product(s)",
        await count(Product.countDocuments({ category: id }), session)
      );
      add(
        "sub-category(ies)",
        await count(ProductCategory.countDocuments({ parent: id }), session)
      );
      break;
    case "brand":
      add("product(s)", await count(Product.countDocuments({ brand: id }), session));
      break;
    case "unit":
      add("product(s)", await count(Product.countDocuments({ unit: id }), session));
      break;
    case "attribute":
      add(
        "product(s)",
        await count(Product.countDocuments({ "attributes.attribute": id }), session)
      );
      add(
        "variation(s)",
        await count(ProductVariation.countDocuments({ attribute: id }), session)
      );
      break;
    case "variation":
      add(
        "product(s)",
        await count(Product.countDocuments({ "attributes.variations": id }), session)
      );
      break;
    case "product": {
      const product = await Product.findById(id).select("translations.en.name").session(session);
      const productName = product?.translations?.get("en")?.name;
      if (productName) {
        add(
          "review(s)",
          await count(Review.countDocuments({ productName }), session)
        );
      }
      break;
    }
    case "user": {
      const user = await User.findById(id).select("email").session(session);
      if (user?.email) {
        add("review(s)", await count(Review.countDocuments({ email: user.email }), session));
      }
      break;
    }
  }

  return usages;
}

export async function deleteIfUnused<T>(
  entity: SafeDeleteEntity,
  id: string,
  session: ClientSession,
  deleteRecord: () => Promise<T | null>
): Promise<{ deleted: T | null; usage: UsageCount[] }> {
  const usage = await checkUsage(entity, id, session);
  if (usage.length > 0) return { deleted: null, usage };
  return { deleted: await deleteRecord(), usage: [] };
}

export async function safeDelete<T>(
  entity: SafeDeleteEntity,
  id: string,
  deleteRecord: (session: ClientSession) => Promise<T | null>
): Promise<{ deleted: T | null; usage: UsageCount[] }> {
  return inTransaction((session) =>
    deleteIfUnused(entity, id, session, () => deleteRecord(session))
  );
}

export function usageError(entity: SafeDeleteEntity, usage: UsageCount[]): string {
  const details = usage
    .map(({ related, count: usedCount }) => `${usedCount} ${related}`)
    .join(" and ");
  return `Cannot delete: this ${entity} is used by ${details}`;
}
