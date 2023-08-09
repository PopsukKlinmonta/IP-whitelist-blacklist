const express = require('express');
const bodyParser = require('body-parser');
const child_process = require('child_process');
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const secretKey = '';

function isAuthenticated(req, res, next) {
  const { key } = req.body;
  
  if (!key || key !== secretKey) {
    return res.status(403).send({ message: 'Invalid key.' });
  }
  
  next();
}

app.get('/', (req, res) => {
  res.send(`
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;700&display=swap');

      body {
        font-family: 'Poppins', sans-serif;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #121212;
        color: #fff;
      }
      form {
        background-color: #212121;
        padding: 20px;
        border-radius: 10px;
        margin: 10px;
        width: 300px;
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
      }
      label {
        display: block;
        margin-bottom: 10px;
      }
      input[type=text], input[type=password] {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        background-color: #1d1d1d;
        color: #fff;
      }
      button {
        background: none;
        border: 2px solid #007BFF;
        color: #007BFF;
        padding: 10px;
        border-radius: 5px;
        width: 100%;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      button:hover {
        background-color: #007BFF;
        color: #fff;
      }

      @keyframes gradientBackground {
        0% {
          background-position: 0% 0%;
        }
        100% {
          background-position: 100% 100%;
        }
      }
    </style>
    <div>
      <form action="/whitelist" method="post">
        <label>Key: <input type="password" name="key"></label>
        <label>IP: <input type="text" name="ip" placeholder="Enter IP to whitelist"></label>
        <button type="submit">Whitelist IP</button>
      </form>
      <form action="/blacklist" method="post">
        <label>Key: <input type="password" name="key"></label>
        <label>IP: <input type="text" name="ip" placeholder="Enter IP to blacklist"></label>
        <button type="submit">Blacklist IP</button>
      </form>

      <button onclick="location.href='/show-whitelist'" type="button">Show Whitelist</button>
      <button onclick="location.href='/show-blacklist'" type="button">Show Blacklist</button>
    </div>
  `);
});

app.post('/whitelist', isAuthenticated, (req, res) => {
  const ip = req.body.ip;

  child_process.exec(`sudo ipset test whitelist_next ${ip}`, (error, stdout, stderr) => {
    if (error) {
      child_process.exec(`sudo ipset add whitelist_next ${ip}`, (error, stdout, stderr) => {
        if (error) {
          return res.send({ message: `Error adding IP to whitelist: ${error}` });
        }

        child_process.exec(`sudo ipset test blacklist_next ${ip}`, (error, stdout, stderr) => {
          if (!error) {
            child_process.exec(`sudo ipset del blacklist_next ${ip}`, (error, stdout, stderr) => {
              if (error) {
                return res.send({ message: `Error removing IP from blacklist: ${error}` });
              }
              
              res.redirect('/');
            });
          } else {
            res.redirect('/');
          }
        });
      });
    } else {
      res.redirect('/');
    }
  });
});

app.post('/blacklist', isAuthenticated, (req, res) => {
  const ip = req.body.ip;

  child_process.exec(`sudo ipset test blacklist_next ${ip}`, (error, stdout, stderr) => {
    if (error) {
      child_process.exec(`sudo ipset add blacklist_next ${ip}`, (error, stdout, stderr) => {
        if (error) {
          return res.send({ message: `Error adding IP to blacklist: ${error}` });
        }
        
        child_process.exec(`sudo ipset test whitelist_next ${ip}`, (error, stdout, stderr) => {
          if (!error) {
            child_process.exec(`sudo ipset del whitelist_next ${ip}`, (error, stdout, stderr) => {
              if (error) {
                return res.send({ message: `Error removing IP from whitelist: ${error}` });
              }
              
              res.redirect('/');
            });
          } else {
            res.redirect('/');
          }
        });
      });
    } else {
      res.redirect('/');
    }
  });
});

app.get('/show-whitelist', (req, res) => {
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;

  child_process.exec(`sudo ipset list whitelist_next`, (error, stdout, stderr) => {
    if (error) {
      return res.send({ message: `Error fetching whitelist: ${error}` });
    }

    const ips = stdout.split('\n').filter(line => ipRegex.test(line));
    res.send(`
      <style>
        body {
          background: #121212;
          color: #fff;
          font-family: 'Poppins', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 0;
        }
        h1 {
          text-align: center;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          padding: 10px;
          background-color: #212121;
          color: #fff;
          border-radius: 5px;
          margin-bottom: 10px;
          width: 300px;
          text-align: center;
        }
        a {
          display: inline-block;
          background-color: #007BFF;
          color: #fff;
          padding: 10px 20px;
          border-radius: 5px;
          text-decoration: none;
          margin-top: 20px;
          transition: background-color 0.3s ease;
        }
        a:hover {
          background-color: #0056b3;
        }
      </style>
      <h1>Whitelisted IPs</h1>
      <ul>
        ${ips.map(ip => `<li>${ip}</li>`).join('')}
      </ul>
      <div style="text-align: center;">
        <a href="/">Back</a>
      </div>
    `);
  });
});

app.get('/show-blacklist', (req, res) => {
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;

  child_process.exec(`sudo ipset list blacklist_next`, (error, stdout, stderr) => {
    if (error) {
      return res.send({ message: `Error fetching blacklist: ${error}` });
    }

    const ips = stdout.split('\n').filter(line => ipRegex.test(line));
    res.send(`
      <style>
        body {
          background: #121212;
          color: #fff;
          font-family: 'Poppins', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 0;
        }
        h1 {
          text-align: center;
        }
        ul {
          list-style: none;
          padding: 0;
        }
        li {
          padding: 10px;
          background-color: #212121;
          color: #fff;
          border-radius: 5px;
          margin-bottom: 10px;
          width: 300px;
          text-align: center;
        }
        a {
          display: inline-block;
          background-color: #007BFF;
          color: #fff;
          padding: 10px 20px;
          border-radius: 5px;
          text-decoration: none;
          margin-top: 20px;
          transition: background-color 0.3s ease;
        }
        a:hover {
          background-color: #0056b3;
        }
      </style>
      <h1>Blacklisted IPs</h1>
      <ul>
        ${ips.map(ip => `<li>${ip}</li>`).join('')}
      </ul>
      <div style="text-align: center;">
        <a href="/">Back</a>
      </div>
    `);
  });
});



app.listen(3020, () => {
  console.log('Server is running on port 3000.');
});
