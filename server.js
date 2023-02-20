import express from "express";
import cors from "cors";
import db from "./database.js";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

app.listen(8080, () => {
  console.log("Server running on port %PORT%".replace("%PORT%", 8080));
});

app.get("/", (req, res, next) => {
  res.json({ message: "Ok" });
});

app.get("/api/user", (req, res, next) => {
  const sql = "select * from UserData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

//Get specific user by id endpoint
app.get("/api/user/:id", (req, res, next) => {
  const sql = "select * from UserData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

//Patch a specific user
app.patch("/api/user/:id", (req, res, next) => {
  const data = {
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    storeId: req.body.storeId,
  };
  db.run(
    `UPDATE UserData set 
           email = COALESCE(?,email), 
           password = COALESCE(?,password)
           role = COALESCE(?,role)
           storeId = COALESCE(?,storeId)
           WHERE id = ?`,
    [data.email, data.password, data.role, data.storeId, req.params.id],
    function (err, result) {
      if (err) {
        res.sendStatus(400).json({ error: res.message });
        return;
      }
      res.json({
        message: "success",
        data: data,
        changes: this.changes,
      });
    }
  );
});

app.delete("/api/user/:id", (req, res, next) => {
  db.run(
    "DELETE FROM UserData WHERE id = ?",
    req.params.id,
    function (err, result) {
      if (err) {
        res.sendStatus(400).json({ error: res.message });
        return;
      }
      res.json({ message: "deleted", changes: this.changes });
    }
  );
});

app.post("/user/register", async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 10);
    const data = {
      id: req.body.id,
      email: req.body.email,
      password: hash,
      role: req.body.role,
    };
    const sql =
      "INSERT INTO UserData (id, email, password, role) VALUES (?,?,?,?)";
    const params = [data.id, data.email, data.password, data.role];
    await db.run(sql, params, (err, result) => {
      if (err) {
        res.sendStatus(400).json({ error: err.message });
        return;
      }
      res.json(result);
    });
  } catch (err) {
    res.sendStatus(400).json({ error: err.message });
  }
});

app.post("/user/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  db.get(
    `SELECT * FROM UserData WHERE email = "${email}"`,
    async (err, result) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (result) {
        const validPass = await bcrypt.compare(password, result.password);
        const payload = {
          id: result.id,
          email: result.email,
          role: result.role,
        };
        if (validPass) {
          const accessToken = jwt.sign(
            { username: result.email, role: result.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "10m" }
          );
          const refreshToken = jwt.sign(
            { email: result.email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "1d" }
          );
          res.cookie("jwt", refreshToken, {
            httpOnly: true,
            sameSite: "None",
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
          });
          res.json({ accessToken });
        } else {
          res.status(406).json({
            message: "Invalid credentials",
          });
        }
      }
    }
  );
});

app.post("/user/refresh", (req, res) => {
  if (req.cookies?.jwt) {
    const refreshToken = req.cookies.jwt;
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) {
          return res.status(406).json({ message: "Unauthorized" });
        } else {
          const accessToken = jwt.sign(
            {
              username: decoded.email,
              role: decoded.role,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: "10m",
            }
          );
          return res.json({ accessToken });
        }
      }
    );
  } else {
    return res.status(406).json({ message: "Unauthorized" });
  }
});

//Get all products endpoint
app.get("/api/product", (req, res, next) => {
  const sql = "select * from ProductData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

//Get specific product by id endpoint
app.get("/api/product/:id", (req, res, next) => {
  const sql = "select * from ProductData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

//get specific store by id
app.get("/api/store/:id", (req, res, next) => {
  const sql = "select * from StoreData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

//get all stores by id
app.get("/api/store", (req, res, next) => {
  const sql = "select * from StoreData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

//get all with storeId :something

// Default response for any other request
app.use(function (req, res) {
  res.sendStatus(404);
});
