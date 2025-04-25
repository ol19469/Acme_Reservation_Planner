const express = require("express");
const pg = require("pg");

const { Client } = pg;
const client = new Client({
  user: "postgres",
  password: "ol121632",
  host: "localhost",
  port: 5432,
  database: "example",
});
const server = express();
const PORT = 3000;

server.use(express.json());

server.get("/", (req, res) => {
  res.send("Hello World!");
});
server.get("/api/customers", async (req, res) => {
  try {
    const result = await client.query("SELECT * from customer");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
server.get("/api/restaurants", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM restaurant");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.get("/api/reservations", async (req, res) => {
  try {
    const result = await client.query(`
        select customer.name as Customer_Name, restaurant.name as Restuarant_Name, reservation.date, reservation.party_count 
        from reservation 
        inner join restaurant on restaurant_id = restaurant.id
        inner join customer on customer_id = customer.id
      `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
client
  .connect()
  .then(() => {
    console.log("Connected to the database");
    server.listen(PORT, () => {
      console.log(`Server is listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to the database:", err);
  });

server.post("/api/customers/:id/reservations", async (req, res) => {
  const customer_id = req.params.id;
  const { restaurant_id, date, party_count } = req.body;

  if (!restaurant_id || !date || !party_count) {
    return res
      .status(400)
      .json({ error: "Missing required reservation fields" });
  }

  try {
    const result = await client.query(
      `
        INSERT INTO reservation (date, party_count, restaurant_id, customer_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
      [date, party_count, restaurant_id, customer_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.delete(
  "/api/customers/:customer_id/reservations/:id",
  async (req, res) => {
    const { customer_id, id } = req.params;

    try {
      const check = await client.query(
        "SELECT * FROM reservation WHERE id = $1 AND customer_id = $2",
        [id, customer_id]
      );

      if (check.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "Reservation not found for this customer" });
      }

      await client.query(
        "DELETE FROM reservation WHERE id = $1 AND customer_id = $2",
        [id, customer_id]
      );

      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
