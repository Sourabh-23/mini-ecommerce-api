require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const ensureAdmin = require("./src/utils/ensureAdmin");

// Require the app's runtime secrets and database URI.
const missingVariables = ["MONGODB_URI", "JWT_SECRET"].filter(
  (name) => !process.env[name]
);

if (missingVariables.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missingVariables.join(", ")}`
  );
  process.exit(1);
}

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await ensureAdmin();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
