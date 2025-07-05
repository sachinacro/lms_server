// models/FAQ.js
import mongoose from "mongoose"; // 'require' की जगह 'import'

const faqSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        unique: true // ताकि एक ही सवाल दोबारा न आए
    },
    answer: {
        type: String,
        required: true
    },
    isAIAnswered: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ES Modules में 'module.exports' की जगह 'export default'
const FAQ = mongoose.model('FAQ', faqSchema);
export default FAQ;