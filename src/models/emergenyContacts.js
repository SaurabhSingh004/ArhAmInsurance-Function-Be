const mongoose = require('mongoose');

const EmergencyContactSchema = new mongoose.Schema({
 userId: {
   type: mongoose.Schema.Types.ObjectId,
   ref: 'users',
   required: true
 },
 isActive: {
  type: Boolean,
  default: false
 },
 name: {
   type: String,
   required: true
 },
 relationship: {
   type: String,
   required: true
 },
 phone: {
   type: String,
   required: true
 },
 email: String
}, { timestamps: true });

EmergencyContactSchema.pre('save', async function(next) {
 if (this.isNew) {
   const contactCount = await this.constructor.countDocuments({ userId: this.userId });
   if (contactCount >= 3) {
     throw new Error('Maximum limit of 3 emergency contacts reached');
   }
 }
 next();
});

const EmergencyContact = mongoose.model('EmergencyContact', EmergencyContactSchema);

module.exports = EmergencyContact;