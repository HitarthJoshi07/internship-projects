const { JWT_SECRET } = require("./config")
const jwt = require("jwt")

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authoriztion;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
        return res.status(403).json({ message: "forbidden" })
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, "JWT_SECRET");

        if (decoded.userId) {
            req.userId = decoded.userId;
            next();

        }else {
             return res.status(403).json({})
        }
    } catch (error) {
        return res.status(403).json({})
    }

}

module.exports = {
    authMiddleware
}