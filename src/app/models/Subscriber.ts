import { Schema, Model, models, model } from "mongoose";

export interface ISubscriber {
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriberSchema = new Schema<ISubscriber>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
  },
  { timestamps: true }
);

const Subscriber: Model<ISubscriber> =
  (models.Subscriber as Model<ISubscriber>) ||
  model<ISubscriber>("Subscriber", SubscriberSchema);

export default Subscriber;