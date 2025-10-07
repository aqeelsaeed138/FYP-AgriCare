import mongoose, { Schema } from "mongoose";

const soilTestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  testDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  location: {
    type: String,
  },
  // Soil Parameters for manuall enteries and lab reports
  soilParameters: {
    phLevel: {
      type: Number,
      min: 0,
      max: 14,
      required: true
    },
    nitrogen: { // in kg/ha or ppm
      type: Number,
      min: 0
    },
    phosphorus: {
      type: Number,
      min: 0
    },
    potassium: {
      type: Number,
      min: 0
    },
    organicCarbon: { // percentage
      type: Number,
      min: 0,
      max: 100
    },
    electricalConductivity: { // dS/m
      type: Number,
      min: 0
    },
    moistureContent: { // percentage
      type: Number,
      min: 0,
      max: 100
    },
    temperature: { // celsius
      type: Number
    },
    soilType: {
      type: String,
      enum: ['Clay', 'Sandy', 'Loamy', 'Silty', 'Peaty', 'Chalky', 'Mixed']
    },
    soilTexture: String
  },
  // URL to uploaded file in cloud storage
  // Data Source Information
}, {
  timestamps: true,
  collection: 'soil_tests'
});

soilTestSchema.index({ userId: 1});

const SoilTest = mongoose.model('SoilTest', soilTestSchema);
