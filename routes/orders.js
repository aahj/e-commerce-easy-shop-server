const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const OrderItem = require('../models/order-items');
const catchAsyncError = require('../middlewares/catchAsyncErrors');

// Get All Orders => /api/v1/orders
router.get('/', catchAsyncError(async (req, res) => {
    const orderList = await Order.find()
        .populate('user', 'name')
        .sort({ 'dateOrdered': -1 });

    if (!orderList) {
        return res.status(404).json({
            success: false
        })
    }
    res.status(200).send(orderList);
}));

// Get Single Category => /api/v1/categories/:id
router.get('/:id', catchAsyncError(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        // nested populate the id's
        .populate(
            {
                path: 'orderItems',
                populate: {
                    path: 'product',
                    populate: 'category'
                }
            }
        );

    if (!order) {
        return res.status(404).json({
            message: 'The order with given id was not found!'
        })
    }
    res.status(200).send(order);
}));


// Create Order => /api/v1/orders
router.post('/', catchAsyncError(async (req, res) => {
    // we wrote Promise.all becuase it returns two promises
    const orderItemsIds = Promise.all(req.body.orderItems.map(async orderItem => {
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            product: orderItem.product
        });
        newOrderItem = await newOrderItem.save();
        return newOrderItem._id;
    }));
    // second promise to resolved
    const orderItemsIdsResolved = await orderItemsIds;

    // get total price of every orderItems
    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId)
            .populate('product', 'price');
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice;
    }));

    // combine each total price of orderItems array
    let totalPrice = totalPrices.reduce((a, b) => a + b, 0);
    totalPrice.toFixed(2);

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        user: req.body.user
    });

    order = await order.save();
    if (!order) {
        return res.status(404)
            .send('The order cannot be created')
    }
    res.status(201).send(order);
}));

// Update Order - ADMIN => /api/v1/orders/:id
router.put('/:id', catchAsyncError(async (req, res, next) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status,
        },
        {
            new: true,
            runValidators: true,
            useFindAndModify: false
        }
    );
    if (!order) {
        return res.status(404).send('The order cannot be updated')
    }

    res.status(200).send(order);
}));

// Delete Order => /api/v1/orders/:id
router.delete('/:id', async (req, res) => {
    Order.findByIdAndDelete(req.params.id)
        .then(async (order) => {
            if (order) {
                // Deleting associated orderItems also
                for (let i = 0; i < order.orderItems.length; i++) {
                    let currentId = order.orderItems[i]._id;
                    await OrderItem.findByIdAndDelete(currentId);
                };

                return res.status(200).json({
                    success: true,
                    message: 'The order Deleted!'
                });
            }
            else {
                return res.status(404).json({
                    success: false,
                    message: 'The order not found!'
                });
            }
        }).catch(err => {
            return res.status(400).json({
                success: false,
                error: err
            });
        })
});
// Get Total Sales - ADMIN => /api/v1/orders/get/totalsales
router.get('/get/totalsales', catchAsyncError(async (req, res) => {
    const totalSales = await Order.aggregate([
        {
            $group: {
                _id: null,
                totalSales: { $sum: '$totalPrice' }
            }
        }
    ]);

    if (!totalSales) {
        return res.status(400).send("The orders sales cannot be generated");
    }
    // return only item in array (totalSales.pop().totalSales)
    res.status(200).send({
        totalSales: totalSales.pop().totalSales
    });
}));

// Get Order Count - ADMIN => /api/v1/orders/get/count
router.get('/get/count', catchAsyncError(async (req, res) => {
    const orderCount = await Order.countDocuments(count => count);

    if (!orderCount) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        })
    }
    res.status(200).json({
        orderCount
    });
}));

// Get Current logged in user Orders => /api/v1/orders/get/userorders/:userid
router.get('/get/userorders/:userid', catchAsyncError(async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userid })
        .populate(
            {
                path: 'orderItems',
                populate: {
                    path: 'product',
                    populate: 'category'
                }
            }
        )
        .sort({ 'dateOrdered': -1 });

    if (!userOrderList) {
        return res.status(404).json({
            success: false
        })
    }
    res.status(200).send(userOrderList);
}));


module.exports = router;