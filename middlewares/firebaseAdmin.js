// firebaseAdmin.js
import admin from "firebase-admin";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import dotenv from "dotenv";
dotenv.config();
// ✅ Update path below to match the actual filename
//const serviceAccount = require("./sachin.json");

//const formattedKey = PRIVATE_KEY.replace(/\\n/g, '\n');

const serviceAccount = {
  "type": process.env.type,
  "project_id":process.env.project_id,
  "private_key_id": process.env.private_key_id,
  "private_key": process.env.private_key.replace(/\\n/g, '\n'),
  "client_id": process.env.client_id,
  "client_email": process.env.client_email,
  "auth_uri": process.env.auth_uri,
  "toke_uri": process.env.token_uri,
  "auth_provider_x509_cert_url": process.env.auth_provider_x509_cert_url,
  "client_x509_cert_url": process.env.client_x509_cert_url,
  "universe_domain": process.env.universe_domain
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;

/*
step 1:= https://console.firebase.google.com/
create project with uncheck host feild
</> create project and copy past firebase code
google auth is ebable
setting service per fir gen secret key
*/
