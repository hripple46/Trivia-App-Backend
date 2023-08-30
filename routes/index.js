const fs = require("fs").promises;
let fetch;
const cron = require("node-cron");
const express = require("express");
var router = express.Router();

// Lock variable
var isUpdating = false;

// Empty questions array initialization
var questions = [];

async function initAndCheck() {
  const lastRunTime = await getLastRunTime();
  const currentTime = new Date();
  const currentDay = currentTime.getUTCDate();
  const lastRunDay = new Date(lastRunTime).getUTCDate();

  let shouldFetchQuestions =
    lastRunDay < currentDay && currentTime.getUTCHours() >= 20;

  try {
    const data = await fs.readFile("questions.json", "utf8");
    questions = JSON.parse(data);
  } catch (err) {
    console.error("Could not load questions from file, fetching new set.");
    shouldFetchQuestions = true;
  }

  if (shouldFetchQuestions) {
    await addQuestions();
    await setLastRunTime(currentTime);
  }
}

async function getLastRunTime() {
  try {
    const data = await fs.readFile("lastRunTime.json", "utf8");
    return new Date(JSON.parse(data).time);
  } catch (err) {
    console.error("Could not read last run time from file:", err);
    return new Date(0);
  }
}

async function setLastRunTime(currentTime) {
  try {
    await fs.writeFile(
      "lastRunTime.json",
      JSON.stringify({ time: currentTime.toISOString() })
    );
  } catch (err) {
    console.error("Could not write last run time to file:", err);
  }
}

async function addQuestions() {
  if (isUpdating) return;
  isUpdating = true;

  const nodeFetch = await import("node-fetch");
  fetch = nodeFetch.default;

  try {
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

    questions = shuffledQuestions;
    await fs.writeFile("questions.json", JSON.stringify(questions));
  } catch (err) {
    console.error("Error fetching questions:", err);
  }

  isUpdating = false; // Release the lock
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

initAndCheck()
  .then(() => {
    cron.schedule(
      "* 12 * * *",
      () => {
        console.log("Fetching new questions...");
        addQuestions();
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
  if (questions.length === 0) {
    await addQuestions();
  }
  res.status(200).json(questions);
});

module.exports = router;
