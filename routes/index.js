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
});

// Define Mongoose Model
const Question = mongoose.model("Question", QuestionSchema);

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

    // Fetch new questions
    const response = await fetch(
      "https://opentdb.com/api.php?amount=5&category=9"
    );
    const data = await response.json();

    // Sort and shuffle questions
    const sortedByDifficulty = data.results.sort((a, b) => {
      const order = ["easy", "medium", "hard"];
      return order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
    });

    const shuffledQuestions = sortedByDifficulty.map((question) => {
      const allAnswers = [
        ...question.incorrect_answers,
        question.correct_answer,
      ];
      question.shuffledAnswers = shuffle([...allAnswers]);
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
      "15 2 * * *",
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
  const questions = await Question.find();
  if (questions.length === 0) {
    await addQuestions();
  }
  res.status(200).json(questions);
});

module.exports = router;
