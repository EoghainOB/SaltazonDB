# saltazonDatabase
To get a fully funtioning (faked) database full of Users / Stores / Products- follows these steps;

```
npm i && npm run start
```

You'll now be able to access the different routes using typical REST-conventions
Feel free to add more routes in the express-server.

Available Routes right now are;

Get all USERS - http://localhost:8000/api/user/
Get user by Id - http://localhost:8000/api/user/{someId}

Get all products - http://localhost:8000/api/product/
Get product by Id - http://localhost:8000/api/product/{someId}

Get all stores - http://localhost:8000/api/store/
Get store by Id - http://localhost:8000/api/store/{someId}

You can also make delete, patch and post requests to the user endpoints, you should be able to add the others yourselves
