const express = require('express');
const app = express();
const cors = require('cors');
const { connectDB } = require('./db/db');
const router = require('./router/windDataROute');
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Sample route
app.use('/api/', router);

connectDB();

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
