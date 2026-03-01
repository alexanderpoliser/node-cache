if process.env.NODE_CACHE_IMPL is "ts"
	module.exports = require "../../dist/node-cache"
else
	module.exports = require "../"
