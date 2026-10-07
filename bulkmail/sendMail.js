const nodemailer = require("nodemailer")



// Create a transporter using SMTP
// const transporter = nodemailer.createTransport({
//   host: "smtp.example.com",
//   port: 587,
//   secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: "xyz@gmail.com",
    pass: "xxxx xxxx xxxx xxxx",
  },
});

function sendMail(to, sub, msg){
    transporter.sendMail({
        to: to,
        subject: sub,
        html: msg

    })
}

sendMail("joshihitarth07@gmail.com", "This is SUBJECT", "this is a node mailer tryal initaied by hitarth joshi part 2")