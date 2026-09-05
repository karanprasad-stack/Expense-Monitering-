const mongoose = require('mongoose');

const udharTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Person',
    index: true
  },
  type: {
    type: String,
    enum: {
      values: ['GAVE', 'RECEIVED'],
      message: 'Transaction type must be GAVE or RECEIVED'
    },
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

udharTransactionSchema.index({ userId: 1, personId: 1, date: -1 });

module.exports = mongoose.model('UdharTransaction', udharTransactionSchema);
