require("dotenv").config();
const { MongoClient } = require("mongodb");
let fetch;
const cron = require("node-cron");
const express = require("express");
const router = express.Router();
const MongoDBConnection = process.env.MONGODB_CONNECTION;

let questionsCollection;

async function init() {
  const client = new MongoClient(MongoDBConnection);
  await client.connect();
  questionsCollection = client.db().collection("questions");

  const nodeFetch = await import("node-fetch");
  fetch = nodeFetch.default;

  try {
    const cursor = questionsCollection.find({});
    const data = await cursor.toArray();
    if (data.length === 0) {
      await addQuestions();
    }
  } catch (err) {
    console.error("Could not load questions from DB, fetching new set.");
    await addQuestions();
  }
}

async function addQuestions() {
  try {
    // Clear old questions from the collection
    await questionsCollection.deleteMany({});

    const response = await fetch(
      "https://opentdb.com/api.php?amount=5&category=9"
    );
    const data = await response.json();

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

    await questionsCollection.insertMany(shuffledQuestions);
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
      "0 * * * *",
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
  const cursor = questionsCollection.find({});
  const questions = await cursor.toArray();
  if (questions.length === 0) {
    await addQuestions();
  }
  res.status(200).json(questions);
});

module.exports = router;
