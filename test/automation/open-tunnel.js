const cbt = require("cbt_tunnels");

const username = process.env.CROSSBROWSERTESTING_USERNAME;
const authkey = process.env.CROSSBROWSERTESTING_AUTHKEY;

function openTunnel() {
  return {
    then: (resolve, reject) => {
      const options = {
        username: username,
        authkey: authkey,
        acceptAllCerts: true,
      };
      cbt.start(options, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(function () {
          return new Promise((resolve) => {
            cbt.stop(resolve);
          });
        });
      });
    },
  };
}

module.exports = openTunnel;
