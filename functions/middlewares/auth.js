const jwt = require('jsonwebtoken');

const key = 'abab';

const isAuthenticated = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        jwt.verify(token, key, (err, data) => {
            if (err) {
                res.status(401).json({
                    success: false, err: 'unauthenticated request'
                });
            }
            else {
                if (data.error != null) {
                    return res.status(401).json({
                        success: false, err: 'unauthenticated request'
                    });
                }
                else {
                    const email = data.body.emails[0].value;
                    const name = data.body.name.givenName + " " + data.body.name.familyName;

                    req.body.email1 = email;
                    req.body.name = name;

                    next();
                }
            }
        });
    }
    else {
        res.status(401).json({
            success: false, err: 'unauthenticated request'
        });
    }
};

module.exports =  isAuthenticated;