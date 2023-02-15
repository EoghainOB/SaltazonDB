import express from "express";
import cors from "cors";

import db from "./database.js";

import bodyParser from "body-parser";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  if ("OPTIONS" == req.method) {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cors());

const HTTP_PORT = 8080;

app.listen(HTTP_PORT, () => {
  console.log("Server running on port %PORT%".replace("%PORT%", HTTP_PORT));
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

app.post("/user/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .sendStatus(400)
      .json({ message: "Username and password are required" });
  let sql = `SELECT * FROM UserData WHERE email = "${email}" and password = "${password}"`;
  const foundUser = db.all(sql, (err, result) => {
    if (err) {
      throw err;
    }
    return result;
  });
  console.log(foundUser);
  if (!foundUser) return res.sendStatus(401);
  const match = bcrypt.compare(password, foundUser.password);
  if (foundUser) {
    const accessToken = jwt.sign(
      { username: foundUser.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30s" }
    );
    const refreshToken = jwt.sign(
      { username: foundUser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken });
  } else {
    res.sendStatus.status(401);
  }
});

app.post("/user/register/", async (req, res) => {
  const hashedPwd = await bcrypt.hash(req.body.password, 10);
  const data = {
    id: req.body.id,
    email: req.body.email,
    password: hashedPwd,
    role: req.body.role,
  };
  const sql =
    "INSERT INTO UserData (id, email, password, role) VALUES (?,?,?,?)";
  const params = [data.id, data.email, data.password, data.role];
  await db.run(sql, params, function (err, result) {
    if (err) {
      res.sendStatus(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: data,
    });
  });
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
