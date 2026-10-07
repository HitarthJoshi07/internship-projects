const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sign = (user) =>
	jwt.sign(
		{ id: user._id, email: user.email, name: user.name },
		process.env.JWT_SECRET,
		{ expiresIn: process.env.JWT_EXPIRES },
	);

// Register
router.post("/register", async (req, res) => {
	try {
		const name = String(req.body.name || "").trim();
		const email = String(req.body.email || "")
			.trim()
			.toLowerCase();
		const password = String(req.body.password || "");
		if (!name || !email || !password)
			return res.status(400).json({ message: "All fields required" });
		if (!emailPattern.test(email))
			return res
				.status(400)
				.json({ message: "Enter a valid email address" });
		if (password.length < 6)
			return res
				.status(400)
				.json({ message: "Password must be at least 6 characters" });

		if (await User.findOne({ email }))
			return res
				.status(409)
				.json({ message: "Email already registered" });

		const user = await User.create({
			name,
			email,
			password: await bcrypt.hash(password, 10),
		});
		res.status(201).json({ token: sign(user), user: { name, email } });
	} catch (e) {
		res.status(500).json({ message: e.message });
	}
});

// Login
router.post("/login", async (req, res) => {
	try {
		const email = String(req.body.email || "")
			.trim()
			.toLowerCase();
		const password = String(req.body.password || "");
		if (!email || !password)
			return res
				.status(400)
				.json({ message: "Email and password are required" });
		if (!emailPattern.test(email))
			return res
				.status(400)
				.json({ message: "Enter a valid email address" });
		const user = await User.findOne({ email });
		if (!user || !(await bcrypt.compare(password, user.password)))
			return res.status(401).json({ message: "Invalid credentials" });

		res.json({
			token: sign(user),
			user: { name: user.name, email: user.email },
		});
	} catch (e) {
		res.status(500).json({ message: e.message });
	}
});

module.exports = router;