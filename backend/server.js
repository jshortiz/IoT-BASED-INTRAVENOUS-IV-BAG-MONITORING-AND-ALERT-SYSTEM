// server/index.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require("mysql2/promise");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Enable CORS and JSON body parsing
app.use(cors());
app.use(bodyParser.json());

// MySQL connection configuration
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "weightData",
  connectionLimit: 10, // Number of concurrent connections
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Initialize the database by creating the tables if they don't exist
async function initDb() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS weights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        weight FLOAT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        room VARCHAR(20) NOT NULL,
        bed VARCHAR(20) NOT NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room VARCHAR(20) NOT NULL,
        bed VARCHAR(20) NOT NULL,
        name VARCHAR(100),
        address VARCHAR(200),
        sex VARCHAR(10),
        age INT,
        UNIQUE KEY unique_room_bed (room, bed)
      )
    `);
  } catch (err) {
    console.error("Error initializing DB:", err);
  } finally {
    connection.release();
  }
}

initDb().catch((err) => console.error("Error initializing DB:", err));

// Endpoint to receive weight updates from the ESP8266
app.get("/update", async (req, res) => {
  try {
    const { weight, room, bed } = req.query;
    console.log(`Received weight: ${weight} for room: ${room}, bed: ${bed}`);

    // Emit the weight update to all connected clients via Socket.IO (if needed)
    io.emit("weightUpdate", { weight, room, bed });

    // Get a connection from the pool
    const connection = await pool.getConnection();

    // Insert the new weight record into the weights table
    await connection.execute(
      "INSERT INTO weights (weight, room, bed) VALUES (?, ?, ?)",
      [weight, room, bed]
    );

    // Keep only the last 10 records for this room and bed:
    // Get the timestamp of the 11th most recent record (if exists)
    const [records] = await connection.execute(
      "SELECT timestamp FROM weights WHERE room = ? AND bed = ? ORDER BY timestamp DESC LIMIT 10, 1",
      [room, bed]
    );

    if (records.length > 0) {
      // Delete all records older than this timestamp
      await connection.execute(
        "DELETE FROM weights WHERE room = ? AND bed = ? AND timestamp < ?",
        [room, bed, records[0].timestamp]
      );
      console.log("Removed older records for room:", room, "bed:", bed);
    }

    connection.release();
    res.sendStatus(200);
  } catch (error) {
    console.error("Error updating weight data:", error);
    res.status(500).send("Error saving data");
  }
});

// Endpoint to fetch weight data from the database
app.get("/weights", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    // Fetch the 10 most recent weight records, ordered by timestamp descending
    const [rows] = await connection.execute(
      "SELECT * FROM weights ORDER BY timestamp DESC LIMIT 10"
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching weights:", error);
    res.status(500).send("Error fetching data");
  }
});

// Endpoint to save/update patient info into the patients table
app.post("/savePatient", async (req, res) => {
  try {
    const { room, bed, name, address, sex, age } = req.body;
    console.log("Saving patient info:", req.body);
    const connection = await pool.getConnection();

    // Use an UPSERT query (INSERT ... ON DUPLICATE KEY UPDATE)
    const sql = `
      INSERT INTO patients (room, bed, name, address, sex, age)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        address = VALUES(address),
        sex = VALUES(sex),
        age = VALUES(age)
    `;
    await connection.execute(sql, [room, bed, name, address, sex, age]);

    connection.release();
    res.sendStatus(200);
  } catch (error) {
    console.error("Error saving patient info:", error);
    res.status(500).send("Error saving data");
  }
});

// Endpoint to fetch patient info by room and bed
app.get("/patient", async (req, res) => {
  try {
    const { room, bed } = req.query;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM patients WHERE room = ? AND bed = ? LIMIT 1",
      [room, bed]
    );
    connection.release();
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "No patient info found" });
    }
  } catch (error) {
    console.error("Error fetching patient info:", error);
    res.status(500).send("Error fetching data");
  }
});

// Endpoint to get patient count
app.get("/patientCount", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT COUNT(*) AS count FROM patients");
    connection.release();
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching patient count:", error);
    res.status(500).send("Error fetching data");
  }
});

// Endpoint to get distinct room count from patients table
app.get("/roomCount", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute("SELECT COUNT(DISTINCT room) AS count FROM patients");
    connection.release();
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching room count:", error);
    res.status(500).send("Error fetching data");
  }
});

// Start the server on port 5000
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
