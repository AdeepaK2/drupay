import mongoose, { Schema, Document } from "mongoose";

// Interface to define the Center document type
export interface ICenter extends Document {
  cid: number;
  name: string;
  location: string;
  admissionFee: number;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Center schema
const centerSchema: Schema = new Schema(
    {
        cid: {
            type: Number,
            required: true,
            unique: true,
            min: 1,
            max: 10,
            validate: {
                validator: Number.isInteger,
                message: '{VALUE} is not an integer'
            }
        },
        name: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        admissionFee: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

// Add indexes for faster queries
centerSchema.index({ cid: 1 }); // Index on cid
centerSchema.index({ name: 1 }); // Index on name if you search by name
centerSchema.index({ location: 1 }); // Index on location if you search by location

// Add a text index to enable text search across name and location
centerSchema.index({ name: 'text', location: 'text' });

// Check if the model exists before creating a new one
// This prevents the "Cannot overwrite model" error during hot reloads
const Center = mongoose.models.Center || mongoose.model<ICenter>("Center", centerSchema);

export default Center;
