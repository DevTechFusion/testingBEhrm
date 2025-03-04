// require("./config/config");
require("./src/databases/mongoose");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const path = require("path");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const cron = require("node-cron");
const index = require("./src/routes");
const app = express();
const { do_backup } = require("./src/utils/backup");
const { update_fines } = require("./src/DAL/attendance");
const { update_lunches, add_lunch_automatically } = require("./src/DAL/lunch");
const fs = require("fs");
const { APPROVED_LEAVES_BY_SYSTEM } = require("./src/utils/utils");
const { api_log } = require("./src/middlewares/api_log");
const { DELETE_OLD_API_LOGS } = require("./src/utils/utils");

app.use("/", index);

// Cron job for lunches at 28 of every month
cron.schedule("0 0 28 * *", async () => {
  // await update_fines();
  // await update_lunches();
  console.log("Adding lunches");
  await add_lunch_automatically();
});

//Cron job for approved leaves by system
cron.schedule(
  "0 9 * * *",
  async () => {
    console.log("Adding approved leaves by system");
    await APPROVED_LEAVES_BY_SYSTEM();
  },
  null,
  true,
  "Asia/Karachi"
);

//Cron job for deleting old api logs

cron.schedule(
  "0 10 27 * *",
  async () => {
    await DELETE_OLD_API_LOGS();
  },
  null,
  true,
  "Asia/Karachi"
);

// Test - Cron job for lunches
// cron.schedule("54 06 26 * *", async () => {
//   // await update_fines();
//   // await update_lunches();
//   console.log("Adding lunches");
//   await add_lunch_automatically();
// });

// cron.schedule("* * * * * *", async () => {
//   console.log("crone workign");
//   await do_backup();
// });

// view engine setup
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

mongoose.set("useFindAndModify", false);
app.use(logger("dev"));
if (process.env.NODE_ENV != "local") {
  // clear all conosle logs
  console.log = function () {};
  console.info = function () {};
  console.error = function () {};
  console.warn = function () {};
  console.debug = function () {};
  console.trace = function () {};

  app.use(
    logger("common", {
      stream: fs.createWriteStream(path.join(__dirname, "access.log"), {
        flags: "a",
      }),
    })
  );
}
app.use(bodyParser.json({ limit: "2mb" }));
app.use(
  bodyParser.urlencoded({ extended: false, limit: "2mb", parameterLimit: 1000 })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: [
      "https://supportportal.metalogixtech.com",
      "https://supportportaldev.metalogixtech.com",
    ],
  })
);
app.use(fileUpload());
app.use(api_log);

// versioning
// will do 2 types of version
// 1- Major versions e.g: 1, 2, 3 .... (URL Path Versioning)
// 2- Minor versions e.g: 1.1, 1.2 .... (URL Param Versioning: when only few endpoints need a change in an api-set)
const { v1_routes } = require("./src/routes/v1/index");
v1_routes(app);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  if (process.env.NODE_ENV === "development") {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
  } else {
    return res.status(404).json({
      message: "Route not Exist",
    });
  }
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
