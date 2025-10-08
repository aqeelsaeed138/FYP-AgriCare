import mongoose, { Schema } from "mongoose";

const weatherDataSchema = new Schema({
  // Location
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
  
  dateRecorded: {
    type: Date,
    required: true,
    index: true
  },
  
  // Weather Parameters
  temperature: {
    current: Number, // celsius
    min: Number,
    max: Number,
    avg: Number,
    feelsLike: Number
  },
  
  humidity: { // percentage
    type: Number,
    min: 0,
    max: 100
  },
  
  rainfall: { // mm
    type: Number,
    default: 0
  },
  
  windSpeed: { // km/h
    type: Number
  },
  
  windDirection: String,
  
  pressure: Number, // hPa
  
  cloudCover: { // percentage
    type: Number,
    min: 0,
    max: 100
  },
  
  uvIndex: Number,
  
  visibility: Number, // km
  
  // Seasonal Information
  season: {
    type: String,
    enum: ['Rabi', 'Kharif', 'Spring', 'Autumn']
  },
  
  // Weather Condition
  condition: {
    main: String, // 'Clear', 'Clouds', 'Rain', etc.
    description: String,
    icon: String
  },
  
  // API Source Information
  apiSource: {
    provider: String, // 'OpenWeatherMap', 'WeatherAPI', etc.
    apiVersion: String,
    fullResponse: Schema.Types.Mixed // Store complete API response
  },
  
  // Forecast Data (if applicable)
  isForecast: {
    type: Boolean,
    default: false
  },
  forecastDays: Number,
  
  // Cache Management
  expiresAt: {
    type: Date,
    index: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'weather_data'
});

// Compound index for location + date uniqueness
weatherDataSchema.index({ 
  'location.coordinates': 1, 
  dateRecorded: 1 
}, { unique: true });

// TTL index to auto-delete old weather data after 30 days
weatherDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WeatherData = mongoose.model('WeatherData', weatherDataSchema);
