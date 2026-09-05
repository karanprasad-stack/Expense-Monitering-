const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: [true, 'Person name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

personSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('Person', personSchema);
