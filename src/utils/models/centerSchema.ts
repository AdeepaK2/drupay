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

// Export the model
const Center = mongoose.model<ICenter>("Center", centerSchema);
export default Center;
