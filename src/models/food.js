const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const foodSchema = new Schema({
    food_count: {
        type: Number
    },
    item_name: {
        type: String,
        required: true
    },
    imageUrl: {type: String},
    carbohydrates: {type: String},
    protein: {type: String},
    fats: {type: String},
    monounsaturated_fats: {type: String},
    polyunsaturated_fats: {type: String},
    saturated_fats: {type: String},
    trans_fats: {type: String},
    fibre: {type: String},
    sugars: {type: String},
    calcium: {type: String},
    calories: {type: String},
    iron: {type: String},
    energy: {type: String},
    magnesium: {type: String},
    phosphorus: {type: String},
    potassium: {type: String},
    sodium: {type: String},
    zinc: {type: String},
    copper: {type: String},
    manganese: {type: String},
    iodine: {type: String},
    vitamin_a: {type: String},
    vitamin_b6: {type: String},
    vitamin_b12: {type: String},
    vitamin_c: {type: String},
    vitamin_d: {type: String},
    vitamin_e: {type: String},
    vitamin_k: {type: String},
    caffeine: {type: String},
    cholesterol: {type: String},
    serving_size: {type: String},
    serving_size_uom: {type: String},
    household_serving_size: {type: String},
    household_serving_size_uom: {type: String}
}, {
    timestamps: true
});

foodSchema.pre('save', function (next) {
    if (!this.calories && this.energy) {
        this.calories = this.energy;
    }
    next();
});

module.exports = mongoose.model('foods', foodSchema);
