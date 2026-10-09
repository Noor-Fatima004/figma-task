import mongoose, { Schema, models, model } from "mongoose";

// Reference number (SL001, SL002...) ke liye atomic counter
const CounterSchema = new Schema({
  _id: { type: String, required: true }, // e.g. "order"
  seq: { type: Number, default: 0 },
});

export default models.Counter || model("Counter", CounterSchema);

export async function nextSequence(name: string): Promise<number> {
  const Counter = models.Counter || model("Counter", CounterSchema);
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq as number;
}

export { mongoose };