require('dotenv').config()
var config = require('12factor-config')

var cfg = config({
  endUserBindPort: {
    env: 'END_USER_API_BIND_PORT',
    type: 'integer',
    default: 3002
  },
  adminBindPort: {
    env: 'ADMIN_API_BIND_PORT',
    type: 'integer',
    default: 3003
  },
  mongoHosts: {
    // comma delimited hostnames & ports, e.g. mongo1.blah.net:27017,mongo2.blah.net:27017,...
    env: 'MONGO_HOSTS',
    type: 'string',
    required: true
  },
  mongoReplicaSet: {
    env: 'MONGO_REPLICA_SET',
    type: 'string'
  },
  mongoUser: {
    env: 'MONGO_USER',
    type: 'string'
  },
  mongoPassword: {
    env: 'MONGO_PASSWORD',
    type: 'string'
  },
  mongoSSL: {
    env: 'MONGO_SSL',
    type: 'boolean',
    default: true
  },
  adminDomainName: {
    env: 'ADMIN_DOMAIN_NAME',
    type: 'string',
    default: '.app.localhost'
  },
  adminSessionExpiry: {
    env: 'ADMIN_SESSION_EXPIRY',
    type: 'integer',
    default: 60 * 60 * 8 // 8 hours
  },
  adminJwtSecret: {
    env: 'ADMIN_JWT_SECRET',
    type: 'string',
    default: 'c1a79517becd38f5339594bc11c358bc568eff96e8bda516c4717ac466660631' // node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
  },
  endUserSessionExpiry: {
    env: 'END_USER_SESSION_EXPIRY',
    type: 'integer',
    default: 60 * 60 * 24 * 90 // 3 months
  },
  endUserJwtSecret: {
    env: 'END_USER_JWT_SECRET',
    type: 'string',
    default: '142fddc6b2ecf2eab3d099cfa6310e1a987f20aee5a28812758ee5d713053abf' // node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"
  },
  adminEmail: {
    env: 'ADMIN_EMAIL_ADDRESS',
    type: 'string',
    required: true,
    default: 'markbame.martires@gmail.com'
  },
  awsRegion: {
    // DONT SET THIS IN DEPLOYMENT - AUTO-DETECTED FROM ENV BY AMZN SDK
    env: 'AWS_REGION',
    type: 'string'
  },
  awsAccessKeyID: {
    // DONT SET THIS IN DEPLOYMENT - AUTO-DETECTED FROM ENV BY AMZN SDK
    env: 'AWS_ACCESS_KEY_ID',
    type: 'string'
  },
  awsSecretAccessKey: {
    // DONT SET THIS IN DEPLOYMENT - AUTO-DETECTED FROM ENV BY AMZN SDK
    env: 'AWS_SECRET_ACCESS_KEY',
    type: 'string'
  },
  smtpHost: {
    env: 'SMTP_HOST',
    type: 'string',
    default: 'email-smtp.eu-west-1.amazonaws.com'
  },
  smtpPort: {
    env: 'SMTP_PORT',
    type: 'integer',
    default: 587
  },
  smtpUsePool: {
    env: 'SMTP_USE_POOL',
    type: 'boolean',
    default: true
  },
  smtpUsername: {
    env: 'SMTP_USERNAME',
    type: 'string',
    default: 'AKIAI4FNMLWBJLB4U6SQ' // IAM user: newssocial-mailer
  },
  smtpPassword: {
    env: 'SMTP_PASSWORD',
    type: 'string',
    default: 'AsdScbGrbiPHRXCMOTIDc02AvckfJXtPvB3penAc+RmZ'
  }
})

module.exports = cfg
