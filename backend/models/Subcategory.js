const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Category' },
  allocatedBudget: { type: Number, required: true, default: 0 },
  spentAmount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Subcategory', subcategorySchema);
