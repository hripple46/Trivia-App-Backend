# Daily Quiz Game - Backend API

This is a Node.js application that serves as an API for retrieving trivia questions. It connects to a MongoDB database to store and retrieve questions, and it periodically fetches new questions from an external source. The API exposes endpoints for retrieving and managing trivia questions.

## Features

- **Question Storage**: Questions are stored in a MongoDB database using Mongoose, and there are separate collections for used questions and trivia questions.

- **Question Fetching**: New questions are fetched periodically, using a CRON scheduler, and added to the trivia questions collection, ensuring a fresh and diverse set of questions.

- **Sorting and Shuffling**: Questions are sorted by difficulty and then shuffled to provide a varied experience for users.

- **Express.js**: The API is built with Express.js, providing a fast and efficient server for handling requests.
