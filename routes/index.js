let fetch;
const cron = require("node-cron");

async function init() {
  const nodeFetch = await import("node-fetch");
  fetch = nodeFetch.default;
}

var express = require("express");
var router = express.Router();

//empty questions array initialization
var questions = [];
//function to add questions to the array every 24 hours
const addQuestions = () => {
  questions.length = 0;
  fetch("https://opentdb.com/api.php?amount=5&category=9")
    .then((response) => response.json())
    .then((data) => {
      // Sort the questions by difficulty level
      const sortedByDifficulty = data.results.sort((a, b) => {
        const order = ["easy", "medium", "hard"];
        return order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
      });

      // Shuffle answers for each question
      const shuffledQuestions = sortedByDifficulty.map((question) => {
        const allAnswers = [
          // Spread operator to add all incorrect answers
          ...question.incorrect_answers,
          question.correct_answer,
        ];
        question.shuffledAnswers = shuffle([...allAnswers]);
        return question;
      });

      // Set the sorted and shuffled questions into state
      questions = shuffledQuestions;
    });
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
    // Schedule a task to run every day at a specific time, e.g., 3:00 AM
    // The cron syntax "0 3 * * *" translates to "At 3:00 AM, every day".
    cron.schedule("0 15 * * *", () => {
      console.log("Fetching new questions..."); // Optional logging
      addQuestions();
    });
  })
  .catch((err) => {
    console.error("Initialization failed:", err);
  });

/* GET home page. */
router.get("/", function (req, res, next) {
  res.send("3 of 5 Correct");
});

router.get("/questions", async function (req, res, next) {
  // Check if the questions array is empty
  const checkIfEmpty = async () => {
    if (questions.length === 0) {
      // If it is, call the addQuestions function
      addQuestions();
    }
  };
  //call function
  await checkIfEmpty();
  res.status(200).json(questions);
});

module.exports = router;
