const fs = require("fs").promises;
let fetch;
const cron = require("node-cron");
const express = require("express");
var router = express.Router();

// Empty questions array initialization
var questions = [];

async function init() {
  await checkAndRunTask(); // Check if we need to run the task immediately upon server startup

  const nodeFetch = await import("node-fetch");
  fetch = nodeFetch.default;

  try {
    const data = await fs.readFile("questions.json", "utf8");
    questions = JSON.parse(data);
  } catch (err) {
    console.error("Could not load questions from file, fetching new set.");
    await addQuestions();
  }
}
async function getLastRunTime() {
  try {
    const data = await fs.readFile("lastRunTime.json", "utf8");
    return new Date(JSON.parse(data).time);
  } catch (err) {
    console.error("Could not read last run time from file:", err);
    return new Date(0); // Return a far past date if the file doesn't exist or can't be read
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

async function checkAndRunTask() {
  const lastRunTime = await getLastRunTime();
  const currentTime = new Date();
  const currentDay = currentTime.getUTCDate();
  const lastRunDay = new Date(lastRunTime).getUTCDate();

  if (lastRunDay < currentDay && currentTime.getUTCHours() >= 20) {
    await addQuestions();
    await setLastRunTime(currentTime);
  }
}

const addQuestions = async () => {
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
};

// Fisher-Yates shuffle algorithm
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

init()
  .then(() => {
    // Schedule a task to run every day at 8PM EST
    cron.schedule(
      "30 20 * * *",
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

/* GET home page. */
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
