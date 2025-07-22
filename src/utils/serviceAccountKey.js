const {google} = require("googleapis");
const token = require("./../config/app.config");

const getAccessToken = async () => {
    // Convert escaped newlines to actual newlines
    const privateKey = token.gcp_private_key.replace(/\\n/g, '\n');
    const jwtClient = new google.auth.JWT(
        token.gcp_client_email,
        null,
        privateKey,  // Use the formatted private key
        ['https://www.googleapis.com/auth/cloud-platform']
    );

    // Use Promise pattern instead of callback
    try {
        const tokens = await jwtClient.authorize();
        return tokens.access_token;
    } catch (err) {
        console.error('Authorization error:', err);
        throw err;
    }
};

module.exports = {
    getAccessToken
}