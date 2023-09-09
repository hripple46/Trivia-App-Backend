require("dotenv").config();
const mongoose = require("mongoose");
let fetch;
const cron = require("node-cron");
const express = require("express");
const router = express.Router();
const MongoDBConnection = process.env.MONGODB_CONNECTION;

// Define Mongoose Schema
const QuestionSchema = new mongoose.Schema({
  category: String,
  type: String,
  difficulty: String,
  question: String,
  correct_answer: String,
  incorrect_answers: [String],
  shuffledAnswers: [String],
  sortOrder: Number, // Added this field for sorting
});

//define a collecltion for used questions
const UsedQuestionSchema = new mongoose.Schema({
  category: String,
  type: String,
  difficulty: String,
  question: String,
  correct_answer: String,
  incorrect_answers: [String],
});
const UsedQuestion = mongoose.model("UsedQuestion", UsedQuestionSchema);

// Define Mongoose Model
const Question = mongoose.model("Question", QuestionSchema);

//define a collecltion for trivia questions
const triviaQuestionSchema = new mongoose.Schema({
  category: String,
  type: String,
  difficulty: String,
  question: String,
  correct_answer: String,
  incorrect_answers: [String],
});
const triviaQuestion = mongoose.model(
  "triviaQuestion",
  triviaQuestionSchema,
  "triviaQuestions"
);

async function init() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MongoDBConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Import node-fetch
    const nodeFetch = await import("node-fetch");
    fetch = nodeFetch.default;

    const questions = await Question.find();
    if (questions.length === 0) {
      await addQuestions();
    }
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

async function addQuestions() {
  try {
    // Clear old questions
    await Question.deleteMany({});

    let questions = await triviaQuestion.aggregate([{ $sample: { size: 5 } }]);

    // add the questions to the used questions collection
    await UsedQuestion.insertMany(questions);

    // delete the questions from triviaQuestions collection
    const questionIds = questions.map((q) => q._id);
    await triviaQuestion.deleteMany({ _id: { $in: questionIds } });

    // Sort and shuffle questions
    const order = ["easy", "medium", "hard"];
    const sortedByDifficulty = questions.sort((a, b) => {
      return order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
    });

    let sortOrder = 1; // Initialize sortOrder value

    const shuffledQuestions = sortedByDifficulty.map((question) => {
      const allAnswers = [
        ...question.incorrect_answers,
        question.correct_answer,
      ];
      question.shuffledAnswers = shuffle([...allAnswers]);
      question.sortOrder = sortOrder++; // Assign and increment sortOrder
      return question;
    });

    // Insert into MongoDB
    await Question.insertMany(shuffledQuestions);
    console.log("Questions added to MongoDB", shuffledQuestions);
  } catch (err) {
    console.error("Error fetching questions:", err);
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

init()
  .then(() => {
    cron.schedule(
      "15 0 * * *",
      async () => {
        console.log("Fetching new questions...");
        await addQuestions();
      },
      {
        timezone: "America/New_York",
      }
    );
  })
  .catch((err) => {
    console.error("Initialization failed:", err);
  });

router.get("/", function (req, res, next) {
  res.send("3 of 5 Correct");
});

router.get("/questions", async function (req, res, next) {
  let questions = await Question.find().sort({ sortOrder: 1 }); // Add sorting here
  if (questions.length === 0) {
    await addQuestions();
    questions = await Question.find().sort({ sortOrder: 1 }); // Add sorting here if new questions are fetched
  }
  console.log("Sorted Questions", questions);
  res.status(200).json(questions);
});

module.exports = router;
