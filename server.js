import express from "express";
import cors from "cors";
import db from "./database.js";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
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

app.get("/api/user/email/:email", (req, res, next) => {
  const sql = "select * from UserData where email = ?";
  const params = [req.params.email];
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
           password = COALESCE(?,password),
           role = COALESCE(?,role),
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
        data: result,
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
      email: req.body.email,
      password: hash,
      role: req.body.role,
    };
    const sql = "INSERT INTO UserData (email, password, role) VALUES (?,?,?)";
    const params = [data.email, data.password, data.role];
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
          result.refreshToken = refreshToken;

          res.cookie("jwt", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
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

app.get("/refresh_token", (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  const email = decoded.email;
  db.get(
    `SELECT * FROM UserData WHERE email = "${email}"`,
    async (err, result) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (result) {
        jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET,
          (err, decoded) => {
            if (err || result.email !== email) return res.sendStatus(403);
            const role = Object.values(result.role);
            const accessToken = jwt.sign(
              {
                UserInfo: {
                  user: decoded.email,
                  role: role,
                },
              },
              process.env.ACCESS_TOKEN_SECRET,
              { expiresIn: "10s" }
            );
            res.json({ role, accessToken });
          }
        );
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    }
  );
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
      storeId: req.body.storeId,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      quantity: req.body.quantity,
      imageUrl: req.body.imageUrl,
    };
    const sql =
      "INSERT INTO ProductData ( storeId, category, title, description, price, quantity, imageUrl) VALUES (?,?,?,?,?,?,?)";
    const params = [
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
    };
    const sql = "INSERT INTO StoreData (name) VALUES (?)";
    const params = [data.name];
    await db.run(sql, params, function (err, result) {
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

app.delete("/api/store/:id", (req, res, next) => {
  const id = req.params.id;
  db.run(
    `DELETE FROM StoreData WHERE uniqueStoreId = ?`,
    [id],
    function (err, result) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.json({ message: "success", changes: this.changes });
    }
  );
});

// Default response for any other request
app.use(function (req, res) {
  res.sendStatus(404);
});
