should = require "should"
nodeCache = require "./resolve-impl"

describe "API contract", ->
	cache = null

	beforeEach ->
		cache = new nodeCache({ stdTTL: 0, checkperiod: 0 })

	afterEach ->
		cache.close()

	describe "public methods exist", ->
		methods = [
			"get", "mget", "set", "mset", "del",
			"take", "ttl", "getTtl", "has", "keys",
			"fetch", "flushAll", "flushStats", "getStats", "close"
		]

		for method in methods
			do (method) ->
				it "#{method} is a function", ->
					(typeof cache[method]).should.equal "function"

	describe "public properties", ->
		it "data is an object", ->
			cache.data.should.be.an.Object()

		it "options is an object with resolved defaults", ->
			cache.options.should.be.an.Object()
			cache.options.stdTTL.should.equal 0
			cache.options.checkperiod.should.equal 0
			cache.options.useClones.should.equal true
			cache.options.deleteOnExpire.should.equal true
			cache.options.enableStats.should.equal true

		it "stats is an object with counters", ->
			cache.stats.should.have.properties "hits", "misses", "keys", "ksize", "vsize"
			cache.stats.hits.should.equal 0

	describe "return types", ->
		it "set returns boolean", ->
			result = cache.set "k", "v"
			result.should.be.a.Boolean()
			result.should.equal true

		it "get returns value or undefined", ->
			cache.set "k", "v"
			cache.get("k").should.equal "v"
			should(cache.get("missing")).be.undefined()

		it "del returns number", ->
			cache.set "k", "v"
			result = cache.del "k"
			result.should.be.a.Number()
			result.should.equal 1

		it "mget returns object", ->
			cache.set "a", 1
			cache.set "b", 2
			result = cache.mget ["a", "b", "c"]
			result.should.be.an.Object()
			result.a.should.equal 1
			result.b.should.equal 2
			should(result.c).be.undefined()

		it "mset returns boolean", ->
			result = cache.mset [{ key: "a", val: 1 }, { key: "b", val: 2 }]
			result.should.equal true

		it "has returns boolean", ->
			cache.set "k", "v"
			cache.has("k").should.equal true
			cache.has("missing").should.equal false

		it "take returns value and removes key", ->
			cache.set "k", "v"
			cache.take("k").should.equal "v"
			cache.has("k").should.equal false

		it "keys returns array of strings", ->
			cache.set "a", 1
			cache.set "b", 2
			k = cache.keys()
			k.should.be.an.Array()
			k.length.should.equal 2

		it "getStats returns stats object", ->
			s = cache.getStats()
			s.should.have.properties "hits", "misses", "keys", "ksize", "vsize"

		it "getTtl returns number or undefined", ->
			cache.set "k", "v"
			ttl = cache.getTtl "k"
			(typeof ttl).should.equal "number"
			ttl.should.equal 0
			should(cache.getTtl("missing")).be.undefined()

		it "ttl returns boolean", ->
			cache.set "k", "v"
			cache.ttl("k", 10).should.equal true
			cache.ttl("missing", 10).should.equal false

		it "fetch returns cached or new value", ->
			result = cache.fetch "k", -> "computed"
			result.should.equal "computed"
			cache.fetch("k", -> "other").should.equal "computed"

		it "fetch accepts raw value (not just function)", ->
			result = cache.fetch "raw", "direct_value"
			result.should.equal "direct_value"

	describe "error codes", ->
		it "EKEYTYPE on invalid key type", ->
			try
				cache.set null, "v"
			catch err
				err.errorcode.should.equal "EKEYTYPE"
				err.name.should.equal "EKEYTYPE"
				return
			throw new Error("expected error")

		it "EKEYSTYPE on non-array keys", ->
			try
				cache.mget "not_an_array"
			catch err
				err.errorcode.should.equal "EKEYSTYPE"
				return
			throw new Error("expected error")

		it "ETTLTYPE on invalid ttl in mset", ->
			try
				cache.mset [{ key: "a", val: 1, ttl: "bad" }]
			catch err
				err.errorcode.should.equal "ETTLTYPE"
				return
			throw new Error("expected error")

		it "ECACHEFULL on maxKeys exceeded", ->
			c = new nodeCache({ maxKeys: 1, checkperiod: 0 })
			c.set "a", 1
			try
				c.set "b", 2
			catch err
				err.errorcode.should.equal "ECACHEFULL"
				c.close()
				return
			c.close()
			throw new Error("expected error")

	describe "event signatures", ->
		it "set event provides key and value", (done) ->
			cache.on "set", (key, value) ->
				key.should.equal "k"
				value.should.equal "v"
				done()
			cache.set "k", "v"

		it "del event provides key and value", (done) ->
			cache.set "k", "v"
			cache.on "del", (key, value) ->
				key.should.equal "k"
				value.should.equal "v"
				done()
			cache.del "k"

		it "flush event fires on flushAll", (done) ->
			cache.on "flush", ->
				done()
			cache.flushAll()

		it "flush_stats event fires on flushStats", (done) ->
			cache.on "flush_stats", ->
				done()
			cache.flushStats()
