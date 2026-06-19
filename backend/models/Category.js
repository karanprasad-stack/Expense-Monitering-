const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true },
  budgetId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Budget' }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
