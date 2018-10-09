const jwt = require('jsonwebtoken');
const config = require('../config');
const admins = require('../admins');
const isAuthenticatedAdmin = (req, res, next) => {
    const token = req.headers.authorization;

    if (token) {
        jwt.verify(token, config.key, (err, data) => {
            if (err) {

                res.status(401).json({
                    success: false, err: 'unauthenticated request'
                });
            }
            else {
                if (data.error !== undefined) {

                    return res.status(401).json({
                        success: false, err: 'unauthenticated request'
                    });
                }
                else {
                    let email = data.emails[0].value;
                    email = email.replace(/\./g, '');
                    email = email.replace(/@/g, '');
                    //console.log('isAuthenticatedAdmin email = '+ email);
                    //console.log(admins[email]);
                    if(admins[email] === true)
                        return next();
                    else {
                      res.status(401).json({
                          success: false, err: 'you are not an admin, please request admin rights'
                      });
                    }
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
module.exports=isAuthenticatedAdmin;