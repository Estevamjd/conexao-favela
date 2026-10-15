const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const adminBuildOutput = /apps[\\/]admin[\\/]\.next([\\/].*)?$/;
const existingBlockList = config.resolver.blockList;

config.resolver.blockList = existingBlockList
  ? Array.isArray(existingBlockList)
    ? [...existingBlockList, adminBuildOutput]
    : [existingBlockList, adminBuildOutput]
  : [adminBuildOutput];

module.exports = withNativeWind(config, { input: './global.css' });
