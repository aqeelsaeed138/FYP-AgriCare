// ============================================
// 3. CROP RECOMMENDATIONS COLLECTION
// ============================================

const cropRecommendationSchema = new Schema({
 
  // Reference to source data
  soilTestId: {
    type: Schema.Types.ObjectId,
    ref: 'SoilTest'
  },
  
  weatherDataId: {
    type: Schema.Types.ObjectId,
    ref: 'WeatherData'
  },
  
  // Request Context
  requestDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    city: String,
    province: String
  },
  
  season: {
    type: String,
    enum: ['Rabi', 'Kharif', 'Spring', 'Autumn'],
    required: true
  },
  
  // Input Data Snapshot (denormalized for historical accuracy)
  inputSnapshot: {
    soilData: {
      phLevel: Number,
      nitrogen: Number,
      phosphorus: Number,
      potassium: Number,
      organicCarbon: Number,
      electricalConductivity: Number,
      moistureContent: Number,
      temperature: Number,
      soilType: String,
      soilTexture: String
    },
    weatherData: {
      temperature: {
        avg: Number,
        min: Number,
        max: Number
      },
      humidity: Number,
      rainfall: Number,
      condition: String
    },
    userPreferences: {
      farmSize: Number, // in acres
      investmentCapacity: String, // 'Low', 'Medium', 'High'
      experienceLevel: String, // 'Beginner', 'Intermediate', 'Expert'
      cropPreferences: [String] // preferred crop types
    }
  },
  
  // AI Model Information
  modelInfo: {
    version: {
      type: String,
      required: true
    },
    modelType: String, // 'Random Forest', 'Neural Network', etc.
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1
    },
    processingTime: Number, // milliseconds
    trainingDate: Date
  },
  
  // Recommended Crops Array (embedded subdocuments)
  recommendedCrops: [{
    cropId: {
      type: Schema.Types.ObjectId,
      ref: 'Crop',
      required: true
    },
    cropName: {
      english: String,
      urdu: String
    },
    
    // Ranking and Scores
    rank: {
      type: Number,
      required: true,
      min: 1
    },
    suitabilityScore: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    
    // Reasoning
    reasoning: String,
    strengthFactors: [String], // What makes this a good choice
    riskFactors: [String], // Potential challenges
    
    // Expected Outcomes
    estimates: {
      yield: {
        min: Number, // kg/acre
        max: Number,
        unit: {
          type: String,
          default: 'kg/acre'
        }
      },
      profit: {
        min: Number, // PKR
        max: Number,
        currency: {
          type: String,
          default: 'PKR'
        }
      },
      roi: Number, // Return on Investment percentage
      breakEvenTime: Number // months
    },
    
    // Growing Requirements
    requirements: {
      waterRequirement: {
        type: String,
        enum: ['Low', 'Moderate', 'High']
      },
      growthDuration: Number, // days to harvest
      laborIntensity: {
        type: String,
        enum: ['Low', 'Moderate', 'High']
      },
      technicalComplexity: {
        type: String,
        enum: ['Easy', 'Moderate', 'Difficult']
      }
    },
    
    // Fertilizer Advisory
    fertilizerAdvice: [{
      type: String, // 'Urea', 'DAP', 'NPK'
      quantity: String, // '100 kg/acre'
      applicationStage: String, // 'Before sowing', 'At flowering'
      timing: String,
      notes: String
    }],
    
    // Pesticide Advisory
    pesticideAdvice: [{
      type: String,
      name: String,
      target: String, // pest/disease name
      applicationMethod: String,
      dosage: String,
      precautions: String
    }],
    
    // Market Information
    marketInfo: {
      currentPrice: Number, // PKR per kg
      priceRange: {
        min: Number,
        max: Number
      },
      marketDemand: {
        type: String,
        enum: ['Low', 'Moderate', 'High', 'Very High']
      },
      seasonalTrends: String,
      lastUpdated: Date
    }
  }],
  
  // Overall Recommendation Summary
  summary: {
    topRecommendation: String,
    keyConsiderations: [String],
    generalAdvice: String,
    additionalNotes: String
  },
  
  // User Interaction
  wasViewed: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'crop_recommendations'
});

// Indexes
cropRecommendationSchema.index({ userId: 1, requestDate: -1 });
cropRecommendationSchema.index({ season: 1, 'location.province': 1 });
cropRecommendationSchema.index({ 'modelInfo.version': 1 });

const CropRecommendation = mongoose.model('CropRecommendation', cropRecommendationSchema);