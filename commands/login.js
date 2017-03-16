const inquirer = require('inquirer');
const request = require('request-promise');
const fs = require('fs');
const exists = require('../utils/utils').fileExists;
const utils = require('../utils/utils');

const proxyUrl = utils.BUILD_URL;

module.exports.aliases = ['signup'];

const emailQ = [
  {
    type: 'input',
    name: 'email',
    message: 'Enter your email address',
  },
];

const passwordQ = [
  {
    type: 'password',
    name: 'password',
    message: 'Enter your password',
  },
];

const getEmail = () => {
  if (exists(utils.credPath)) {
    console.log('You are already logged in. Please log out to switch accounts.');
  } else {
    inquirer
      .prompt(emailQ)
      .then(getToken)
      .catch(console.log);
  }
};

const getToken = (input) => {
  request.post(`${proxyUrl}/users/action`, {
    json: true,
    body: input,
  }).then((res) => {
    if (res === 'signup') {
      console.log('Hmm, it seems like you need to sign up!');
      signup(input.email);
    } else if (res === 'login') {
      inquirer
        .prompt(passwordQ)
        .then(p => login(input.email, p.password)).catch(console.log);
    } else if (res === 'incomplete') {
      console.log('This user hasn\'t been completely set up yet! Check your email to proceed.');
    }
  });
};

const login = (email, password) => {
  const j = request.jar();
  request.post(`${proxyUrl}/login/cli`, {
    json: true,
    jar: j,
    body: {
      usermail: email,
      password,
    },
  }).on('response', () => {
    fs.writeFile(utils.credPath, JSON.stringify(j._jar), (err) => {
      if (err) console.log(err);
      console.log('Logged In!');
    });
  }).catch((res) => {
    console.log(res.error.error);
  });
};

const signup = (email) => {
  request.post(`${proxyUrl}/users`, {
    json: true,
    body: {
      email,
    },
  }).then().catch(console.log);
  console.log(`We've created an account for you with the email ${email.green}`);
  console.log('Check your email to complete registration!');
  console.log('However, don\'t fret, we have already set up your api key so you can get started right away.');
};

module.exports.run = getEmail;