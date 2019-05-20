const chai = require('chai');
const chaiHttp = require('chai-http');
const mockery = require('mockery');
const to = require('await-to-js').default;
const nodemailerMock = require('nodemailer-mock');
const redisMock = require('redis-mock');


const expect = chai.expect;

chai.use(chaiHttp);

describe('Payments', () => {
  let queue = null;

  before(() => {
    require('dotenv').config();

    let queue = require('../../config/queue');

    mockery.enable({
      warnOnUnregistered: false
    });

    mockery.registerMock('nodemailer', nodemailerMock);
    mockery.registerMock('redis', redisMock);
  });

  after(async () => {
    // Remove our mocked nodemailer and disable mockery
    mockery.deregisterAll();
    mockery.disable();
  });

  afterEach(async () => {
    // Reset the mock back to the defaults after each test
    nodemailerMock.mock.reset();
  });

  describe('Create Purchase Job', () => {
    it('should create purchase creation background job successfully', async () => {
      const [ error, response ] = await to(
        chai.request(require('../../app'))
          .post(`/payments/${process.env.CCA_ORDER_STATUS_EVENT_URL_SHA}`)
          .send({ password: '123', confirmPassword: '123' })
      );

      expect(error).to.be.null;
      expect(response).to.have.status(200);
    });
  })
});
