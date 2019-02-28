module.exports = {
  web: {
    client_id: process.env.GOOGLE_CLIENT_ID,
    project_id: process.env.GOGGLE_PROJECT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_ur: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uris: [
      'https://noquae.firebaseapp.com/__/auth/handler'
    ],
    javascript_origins: [
      'http://localhost',
      'http://localhost:5000',
      'https://noquae.firebaseapp.com'
    ]
  }
};
