require('dotenv').config()
const app = require('./index');

const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on port No. ${process.env.PORT}`);
  });
  module.exports = server;