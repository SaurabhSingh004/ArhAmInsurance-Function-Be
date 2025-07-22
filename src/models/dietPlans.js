const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  item_name: String,
  imageUrl: String,
  carbohydrates: String,
  protein: String,
  fats: String,
  monounsaturated_fats: String,
  polyunsaturated_fats: String,
  saturated_fats: String,
  trans_fats: String,
  fibre: String,
  sugars: String,
  calcium: String,
  calories: String,
  iron: String,
  energy: String,
  magnesium: String,
  phosphorus: String,
  potassium: String,
  sodium: String,
  zinc: String,
  copper: String,
  manganese: String,
  iodine: String,
  vitamin_a: String,
  vitamin_b6: String,
  vitamin_b12: String,
  vitamin_c: String,
  vitamin_d: String,
  vitamin_e: String,
  vitamin_k: String,
  caffeine: String,
  cholesterol: String,
  serving_size: String,
  serving_size_uom: String,
  household_serving_size: String,
  household_serving_size_uom: String,
  isCompleted: {
    type:Boolean,
    default: false
  }
},{_id:false});

// models/dayDietPlanSchema.js
const mealsArraySchema = new mongoose.Schema({
  meals: [mealSchema]
},{_id:false});

const dayDietPlanSchema = new mongoose.Schema({
  breakfast_meal: [mealsArraySchema],
  lunch_meal: [mealsArraySchema],
  evening_snack: [mealsArraySchema],
  dinner_meal: [mealsArraySchema],
  pre_workout: [mealsArraySchema],
  post_workout: [mealsArraySchema],
  total_water: String,
  note: String,
  date: Date
});

// models/weeklyDietPlanSchema.js
const weeklyDietPlanSchema = new mongoose.Schema({
  weekNumber: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  daysDietPlanData: [dayDietPlanSchema]
});

// models/DietPlan.js
const dietPlanSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalWeeks: {
    type: Number,
    required: false
  },
  weeklyDietPlans: [weeklyDietPlanSchema],
  status: {
    type: String,
    enum: ['PROCESSING', 'COMPLETED', 'ERROR'],
    default: 'PROCESSING'
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  generationProgress: {
    currentWeek: Number,
    currentDay: Number,
    totalDaysGenerated: Number,
    lastError: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DietPlan', dietPlanSchema);
