const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  month: { type: Number, required: true }, // 1-12
  year: { type: Number, required: true },
  totalBudget: { type: Number, required: true },
  allocatedAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 }
}, { timestamps: true });

budgetSchema.pre('save', function() {
  this.allocatedAmount = this.allocatedAmount || 0;
  this.totalBudget = this.totalBudget || 0;
  this.remainingAmount = this.totalBudget - this.allocatedAmount;
});

module.exports = mongoose.model('Budget', budgetSchema);
