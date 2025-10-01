import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const farmerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"], 
        default: "Point",
      },
      coordinates: {
        type: [Number], 
        default: [0, 0],
      },
      address: { type: String }, // optional readable address
    },
    marketplace: {
      isSeller: { type: Boolean, default: false },
      shopName: { type: String },
      contactInfo: {
        phone: { type: String },
        email: { type: String },
      },
      products: [
        {
          name: { type: String, required: true },
          category: { type: String },
          price: { type: Number, required: true },
          description: { type: String },
          images: [{ type: String }], // store image URLs
          createdAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  { timestamps: true }
);

farmerSchema.methods.getPublicProfile = function () {
  return {
    _id: this._id,
    name: this.name,
    phone: this.phone,
    email: this.email,
    location: this.location,
    isSeller: this.marketplace?.isSeller || false,
    shopName: this.marketplace?.shopName,
    createdAt: this.createdAt,
  };
};

farmerSchema.methods.generateRefreshToken = function () {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  const expiry = process.env.REFRESH_TOKEN_EXPIRY;

  if (!secret) {
    throw new Error("Refresh TOKEN SECRET is not defined in environment variables");
  }
  return jwt.sign(
    { _id: this._id },
    secret,
    { expiresIn: expiry || "7d"}
  );
};

farmerSchema.methods.generateAccessToken = function () {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  const expiry = process.env.ACCESS_TOKEN_EXPIRY;

  if (!secret) {
    throw new Error("ACCESS TOKEN SECRET is not defined in environment variables");
  }

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      phone: this.phone,
    },
    secret,
    { expiresIn: expiry || "1h" }
  );
};

export const Farmer = mongoose.model("Farmer", farmerSchema);


