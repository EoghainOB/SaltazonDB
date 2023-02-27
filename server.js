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

//User endpoints

app.get("/api/user", (req, res, next) => {
  const sql = "select * from UserData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

app.get("/api/user/:id", (req, res, next) => {
  const sql = "select * from UserData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

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
        res.status(400).json({ error: res.message });
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
        res.status(400).json({ error: res.message });
        return;
      }
      res.json({ message: "deleted", changes: this.changes });
    }
  );
});

app.post("/user/register", async (req, res, next) => {
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
        res.status(400).json({ error: err.message });
        return;
      }
      res.json(result);
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/user/login", async (req, res, next) => {
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
          storeId: result.storeId,
        };
        if (validPass) {
          const accessToken = jwt.sign(
            {
              username: result.email,
              role: result.role,
              storeId: result.storeId,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "10m" }
          );
          const refreshToken = jwt.sign(
            { email: result.email },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "1d" }
          );
          const refreshTokenJson = JSON.stringify(refreshToken);

          const sql = "UPDATE UserData SET refreshToken = ? WHERE email = ?";
          const params = [refreshTokenJson, email];
          await db.run(sql, params);

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

app.post("/user/refresh", (req, res, next) => {
  const email = decoded.email;
  const sql = "SELECT refreshToken FROM UserData WHERE email = ?";
  const params = [email];
  db.get(sql, params, (err, result) => {
    if (err || !result) {
      return res.status(406).json({ message: "Unauthorized" });
    }

    const refreshTokenJson = result.refreshToken;
    const refreshToken = JSON.parse(refreshTokenJson);

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
              storeId: decodedc.storeId,
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
  });
});

app.post("/user/logout", (req, res) => {
  res.clearCookie("token");
  res.sendStatus(200);
});

//Product endpoints

app.get("/api/product", (req, res, next) => {
  let sql = "SELECT * FROM ProductData WHERE 1=1";
  let params = [];
  if (req.query.category && req.query.category !== "all") {
    sql += " AND category = ?";
    params.push(req.query.category);
  }
  if (req.query.q) {
    sql += " AND lower(title) LIKE ?";
    params.push(`%${req.query.q.toLowerCase()}%`);
  }
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

app.get("/api/product/:id", (req, res, next) => {
  const sql = "select * from ProductData where id = ?";
  const params = [req.params.id];
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.post("/api/product/", async (req, res, next) => {
  try {
    const data = {
      id: req.body.id,
      storeId: req.body.storeId,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      quantity: req.body.quantity,
      imageUrl: req.body.imageUrl,
    };
    const sql =
      "INSERT INTO ProductData (id, storeId, category, title, description, price, quantity, imageUrl) VALUES (?,?,?,?,?,?,?,?)";
    const params = [
      data.id,
      data.storeId,
      data.category,
      data.title,
      data.description,
      data.price,
      data.quantity,
      data.imageUrl,
    ];
    await db.run(sql, params, (err, result) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json(result);
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/product/:id", (req, res, next) => {
  const data = {
    quantity: req.body.quantity,
  };
  db.run(
    `UPDATE ProductData SET quantity = quantity + COALESCE(?, 0) WHERE id = ?`,
    [data.quantity, req.params.id],
    function (err, result) {
      if (err) {
        res.status(400).json({ error: res.message });
        return;
      }
      res.json(result);
    }
  );
});

app.delete("/api/product/:id", (req, res, next) => {
  const id = req.params.id;
  db.run(`DELETE FROM ProductData WHERE id = ?`, [id], function (err, result) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: "success", changes: this.changes });
  });
});

//Store endpoints

app.get("/api/store", (req, res, next) => {
  const sql = "select * from StoreData";
  const params = [];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: rows,
    });
  });
});

app.get("/api/store/:id", (req, res, next) => {
  const params = [req.params.id];
  const sql = "select * from StoreData where uniqueStoreId = ?";
  db.get(sql, params, (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: "success",
      data: row,
    });
  });
});

app.post("/api/store/", async (req, res, next) => {
  try {
    const data = {
      name: req.body.name,
      uniqueStoreId: req.body.uniqueStoreId,
    };
    const sql = "INSERT INTO StoreData (name, uniqueStoreId) VALUES (?,?)";
    const params = [data.name, data.uniqueStoreId];
    await db.run(sql, params, (err, result) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json(result);
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Default response for any other request
app.use(function (req, res) {
  res.sendStatus(404);
});
