const express = require('express');
const app = express();
const mongoose = require('mongoose');
// const morgan = require('morgan');
const cors = require('cors');
const errorMiddleware = require('./middlewares/error');
const authJwt = require('./utills/jwt');
require('dotenv/config')

// Enabling CORS
app.use(cors());
app.options('*', cors())

// Handling uncaught Exception
process.on('uncaughtException', err => {
    console.log(`Error ${err.stack}`);
    console.log('Shutting down due to Uncaught Exceptions');
    process.exit(1);
})

// middleware Json parser
app.use(express.json());
// middleware to verifiy token for jwt
app.use(authJwt());

app.use('/public/uploads', express.static(__dirname + '/public/uploads'))

// Routes
const categoriesRoutes = require('./routes/categories');
const productsRoutes = require('./routes/products');
const usersRoutes = require('./routes/user');
const ordersRoutes = require('./routes/orders');

app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/orders', ordersRoutes);


// Handling error Middlewares
app.use(errorMiddleware);

// Database connection
mongoose.connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
})
    .then((con) => {
        console.log(`Mongodb connected with host: ${con.connection.host} `);
    })
    .catch(err => {
        console.log(err);
    })

// server created
const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on port ${process.env.PORT} in ${process.env.NODE_ENV}`);
});


// Handling Unhandled Promise Rejection
process.on('unhandledRejection', err => {
    console.log(`Error ${err.message}`);
    console.log('Shutting down the server due to unhandled promise rejection');
    server.close(() => {
        process.exit(1);
    });
});