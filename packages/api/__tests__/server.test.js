const nock = require('nock');
const api = require('../src');

const serverVariables = require('@readme/oas-examples/3.0/json/server-variables.json');

let sdk;
const petId = 123;
const response = {
  id: petId,
  name: 'Buster',
};

describe('#server()', () => {
  beforeEach(() => {
    sdk = api(serverVariables);
  });

  it('should use server variable defaults if no server or variables are supplied', () => {
    const mock = nock('https://demo.example.com:443/v2/').post('/').reply(200, response);

    return sdk.post('/').then(res => {
      expect(res).toStrictEqual(response);
      mock.done();
    });
  });

  it('should support supplying a full server url', () => {
    const mock = nock('https://buster.example.com:3000/v14').post('/').reply(200, response);

    sdk.server('https://buster.example.com:3000/v14');

    return sdk.post('/').then(res => {
      expect(res).toStrictEqual(response);
      mock.done();
    });
  });

  it('should support supplying a server url with server variables', () => {
    const mock = nock('http://dev.local/v14').post('/').reply(200, response);

    sdk.server('http://{name}.local/{basePath}', {
      name: 'dev',
      basePath: 'v14',
    });

    return sdk.post('/').then(res => {
      expect(res).toStrictEqual(response);
      mock.done();
    });
  });

  it.todo('should be able to supply a url on an OAS that has no servers defined');

  it.todo("should be able to supply a url that doesn't match any defined server");
});