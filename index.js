'use strict';

/**
 * Module dependencies
 */
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const bl = require('bl');
const bufferEq = require('buffer-equal-constant-time');
const queryString = require('querystring');

/**
 * Helper functions
 */
function signData(secret, data) {
	return 'sha1=' + crypto.createHmac('sha1', secret).update(data).digest('hex');
}

function verifySignature(secret, data, signature) {
	return bufferEq(new Buffer(signature), new Buffer(signData(secret, data)));
}

var GithubWebhook = function(options) {
	if (typeof options !== 'object') {
		throw new TypeError('must provide an options object');
	}

	if (typeof options.path !== 'string') {
		throw new TypeError('must provide a \'path\' option');
	}

	options.secret = options.secret || '';

	// Make handler able to emit events
	Object.setPrototypeOf(githookHandler, EventEmitter.prototype);
	EventEmitter.call(githookHandler);

	return githookHandler;

	function githookHandler(req, res, next) {
		if (req.method !== 'POST' || req.url.split('?').shift() !== options.path) {
			return next();
		}

		function reportError(message) {
			// respond error to sender
			res.status(400).send({
				error: message
			});

			// emit error
			githookHandler.emit('error', new Error(message), req, res);
		}

		// check header fields
		let id = req.headers['x-github-delivery'];
		if (!id) {
			return reportError('No id found in the request');
		}

		let event = req.headers['x-github-event'];
		if (!event) {
			return reportError('No event found in the request');
		}

		let sign = req.headers['x-hub-signature'] || '';
		if (options.secret && !sign) {
			return reportError('No signature found in the request');
		}

		req.pipe(
			bl(function(err, data) {
				if (err) {
					return reportError(err.message);
				}

				// verify data with secret (if any)
				if (options.secret && !verifySignature(options.secret, data, sign)) {
					return reportError('Failed to verify signature');
				}

				// parse payload
				let dataString = data.toString();
				let payload;
				if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
					dataString = queryString.parse(dataString).payload;
				}

				try {
					payload = JSON.parse(dataString);
				} catch (e) {
					return reportError(e.message);
				}

				const repo = payload.repository.name;

				// emit events
				githookHandler.emit('*', event, repo, payload);
				githookHandler.emit(event, repo, payload);
				githookHandler.emit(repo, event, payload);

				res.status(200).send({
					success: true
				});
			})
		);
	}
};

/**
 * Module exports
 */
module.exports = GithubWebhook;
