import pkg from 'sqlite3';

const {verbose} = pkg;

import fs from "fs";

const sqlite3 = verbose();
const DBSOURCE = "db.sqlite"

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message)
        throw err
    } else {
        console.log('Connected to the SQLite database.');
        const users = GetUsersAsJson();
        db.run(`create table UserData (
                id INT,
                email VARCHAR(50),
                password VARCHAR(50),
                role VARCHAR(11),
                storeId INT
             )`,
            (err) => {
                if (err) {
                    // Table already created
                    console.log('Already User-table there');
                } else {
                    // Table just created, creating some rows
                    const insert = 'INSERT INTO UserData (id, email, password, role, storeId) VALUES (?,?,?,?,?)';
                    users.map(newUser => {
                        db.run(insert, [newUser.id, newUser.email, newUser.password, newUser.role, newUser.uniqueStoreId]);
                    })
                    console.log(`${users.length} Users created`);
                }
            });
        const stores = GetStoresAsJson();
        db.run(`create table StoreData (
                name VARCHAR(50),
                uniqueStoreId INT
              )`,
            (err) => {
                if (err) {
                    // Table already created
                    console.log('Already Store-table there');
                } else {
                    // Table just created, creating some rows
                    const insert = 'INSERT INTO StoreData (name, uniqueStoreId) VALUES (?,?)';
                    stores.map(newStore => {
                        db.run(insert, [newStore.name, newStore.uniqueStoreId]);
                    })
                    console.log(`${stores.length} Stores created`);
                }
            });
        const products = GetProductsAsJson();
        db.run(`create table ProductData (
                    id INT, 
                    title VARCHAR(50), 
                    description TEXT, 
                    imageUrl VARCHAR(50),
                    storeId INT, 
                    price VARCHAR(50), 
                    quantity INT, 
                    category VARCHAR(50));`,
            (err) => {
                if (err) {
                    // Table already created
                    console.log('Already Products-table there');
                } else {
                    // Table just created, creating some rows
                    const insert = 'INSERT INTO ProductData (id, title, description, imageUrl, storeId, price, quantity, category) VALUES (?,?,?,?,?,?,?,?)';
                    products.map(product => {
                        db.run(insert, [product.id, product.title, product.description, product.imageUrl, product.storeId, product.price, product.quantity, product.category]);
                    })
                    console.log(`${products.length} Products created`);
                }
            });
    }
});

function GetUsersAsJson() {
    return JSON.parse(fs.readFileSync("./mockData/User_Mock_data.json"));
}

function GetStoresAsJson() {
    return JSON.parse(fs.readFileSync("./mockData/Store_Mock_data.json"));
}

function GetProductsAsJson() {
    return JSON.parse(fs.readFileSync("./mockData/Products_Mock_data.json"));
}

export default db;