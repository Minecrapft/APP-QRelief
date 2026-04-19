const appJson = require("./app.json");

const baseExpoConfig = appJson.expo;
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const plugins = [...(baseExpoConfig.plugins ?? [])];

plugins.push([
  "react-native-maps",
  {
    androidGoogleMapsApiKey: googleMapsApiKey,
    iosGoogleMapsApiKey: googleMapsApiKey
  }
]);

module.exports = {
  expo: {
    ...baseExpoConfig,
    plugins
  }
};
