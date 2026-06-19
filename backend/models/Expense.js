const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  amount: { type: Number, required: true },
  description: { type: String, required: false, default: 'General' },
  date: { type: Date, required: true, default: Date.now },
  categoryId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Category' },
  subcategoryId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Subcategory' },
  paymentMethod: { type: String },
  isRecurring: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
