import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend files
app.use(express.static(
    path.join(__dirname, "../package_hospitalAppointment")
));

// app.use(express.static(
//     path.join(__filename," ../package_hospitalAppointment/admin.html")
// ));

// Home route
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../package_hospitalAppointment/index.html")
    );
});

// Admin route
app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../package_hospitalAppointment/admin.html")
    );
});

app.get("/job", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../package_hospitalAppointment/book.html")
    )
}) 

app.listen(port, () => {
    console.log(`App is listening on http://localhost:${port}`);
});