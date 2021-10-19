// it verifies token for every api request

const expressJwt = require('express-jwt');

function authJwt() {
    const secret = process.env.JWT_SECRET;
    return expressJwt({
        secret,
        algorithms: ['HS256'],
        isRevoked: isRevoked //isRevoked allowed to check isAdmin payload in token
    }).unless({
        // get the following api without authentication
        path: [
            { url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS'] },
            { url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS'] },

            '/api/v1/users/login',
            '/api/v1/users/register'
        ]
    })
};

async function isRevoked(req, payload, done) {
    // reject if isAdmin ===false
    if (!payload.isAdmin) {
        done(null, true)
    }
    done();
};

module.exports = authJwt;