// seed.js
import mongoose from 'mongoose';
import FAQ from '../models/FAQ.js'; // Import the FAQ model 
import 'dotenv/config';

const MONGODB_URI = process.env.DB || 'mongodb://localhost:27017/your_lms_db';

const fixedFAQs = [
    {
        question: "How to submit an assignment?",
        answer: "Assignments can be submitted through the 'Assignments' section in your course dashboard. Click on the assignment name and follow the instructions to upload your file.",
        isAIAnswered: false
    },
    {
        question: "What are the grading criteria for courses?",
        answer: "Grading criteria vary by course. Please refer to the syllabus or the 'Grades' section for specific details on how your performance will be evaluated.",
        isAIAnswered: false
    },
    {
        question: "How do I reset my password?",
        answer: "You can reset your password by clicking on the 'Forgot Password' link on the login page and following the instructions sent to your registered email.",
        isAIAnswered: false
    },
    {
        question: "Where can I find course materials?",
        answer: "Course materials are typically located in the 'Course Content' or 'Modules' section of each course page.",
        isAIAnswered: false
    },
    {
        question: "How do I contact my instructor?",
        answer: "You can contact your instructor through the messaging system within the LMS, or via their email address provided in the course syllabus.",
        isAIAnswered: false
    },
    // --- Add MORE of your common LMS FAQs here ---
    {
        question: "How do I enroll in a new course?",
        answer: "To enroll in a new course, navigate to the 'Course Catalog' section and click 'Enroll' on the desired course. Some courses may require a registration key.",
        isAIAnswered: false
    },
    {
        question: "What should I do if I forget my username?",
        answer: "If you forget your username, please contact our technical support team through the 'Help' section on the login page, or email support@yourlms.com.",
        isAIAnswered: false
    },
    // ... (jitne questions aap add kar sakte hain, karein)
];

async function seedFAQs() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Database Connected for seeding');

        for (const faq of fixedFAQs) {
            try {
                await FAQ.create(faq);
                console.log(`Added fixed FAQ: "${faq.question}"`);
            } catch (error) {
                if (error.code === 11000) {
                    console.warn(`FAQ already exists: "${faq.question}" - Skipping.`);
                } else {
                    console.error(`Error adding FAQ "${faq.question}":`, error.message);
                }
            }
        }
        console.log('Fixed FAQs seeding complete.');
    } catch (err) {
        console.error('Database connection or seeding error:', err);
    } finally {
        mongoose.connection.close();
    }
}

seedFAQs();