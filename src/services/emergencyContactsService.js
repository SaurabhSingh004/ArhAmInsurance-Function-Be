const EmergencyContact = require('../models/emergenyContacts');

exports.addContact = async (userId, contactData) => {
  const count = await EmergencyContact.countDocuments({ userId });
  if (count >= 3) {
    throw new Error('Maximum limit of 3 emergency contacts reached');
  }
  const contact = new EmergencyContact({
    userId,
    isActive: count == 0 ? true : false,
    ...contactData
  });
  return contact.save();
};

exports.updateContact = async (contactId, updates) => {
  const contact = await EmergencyContact.findOneAndUpdate(
    { _id: contactId },
    updates,
    { new: true }
  );
  if (!contact) throw new Error('Contact not found');
  return contact;
};

exports.deleteContact = async (contactId) => {
  const contact = await EmergencyContact.findOneAndDelete({ _id: contactId });
  if (!contact) throw new Error('Contact not found');
  return contact;
};

exports.getContactsByUserId = async (userId) => {
  return EmergencyContact.find({ userId });
};

exports.getActiveContact = async (userId) => {
  const contact = await EmergencyContact.findOne({ userId: userId, isActive: true });
  return contact || null;
};

exports.makeContactActive = async (userId, contactId) => {
  // First, verify the contact exists and belongs to the user
  const contact = await EmergencyContact.findOne({ _id: contactId, userId });
  if (!contact) {
    throw new Error('Contact not found or does not belong to this user');
  }

  // Deactivate all contacts for this user
  await EmergencyContact.updateMany(
    { userId },
    { isActive: false }
  );

  // Activate the specific contact
  const updatedContact = await EmergencyContact.findOneAndUpdate(
    { _id: contactId, userId },
    { isActive: true },
    { new: true }
  );

  return updatedContact;
};