const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const exclusionListModule = require("metro-config/private/defaults/exclusionList");
const exclusionList = exclusionListModule.default ?? exclusionListModule;

// Ensure we pass a normalized (Windows-friendly) directory path to Expo.
const projectRoot = path.resolve(__dirname);
const config = getDefaultConfig(projectRoot);

// Server-only code uses Node libraries such as fs through firebase-admin.
// Keep it out of the React Native bundle.
config.resolver.blockList = exclusionList([/functions[\/\\].*/]);

module.exports = config;

