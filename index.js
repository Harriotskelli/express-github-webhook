'use strict';

/**
 * Module dependencies
 */
const EventEmitter = require('events').EventEmitter;
const crypto = require('crypto');
const bufferEq = require('buffer-equal-constant-time');

/**
 * Helper functions
 */
function signData(secret, data) {
	return 'sha1=' + crypto.createHmac('sha1', secret).update(data).digest('hex');
}

function verifySignature(secret, data, signature, signData) {
	return bufferEq(new Buffer.from(signature), new Buffer.from(signData(secret, data)));
}

const GithubWebhook = function(options) {
	if (typeof options !== 'object') {
		throw new TypeError('must provide an options object');
	}

	if (typeof options.path !== 'string') {
		throw new TypeError('must provide a \'path\' option');
	}

	options.secret = options.secret || '';
	options.deliveryHeader = options.deliveryHeader || 'x-github-delivery';
	options.eventHeader = options.eventHeader || 'x-github-event';
	options.signatureHeader = options.signatureHeader || 'x-hub-signature';
	options.signData = options.signData || signData;

	// Make handler able to emit events
	Object.assign(githookHandler, EventEmitter.prototype);
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
		let id = req.headers[options.deliveryHeader];
		if (!id) {
			return reportError('No id found in the request');
		}

		let event = req.headers[options.eventHeader];
		if (!event) {
			return reportError('No event found in the request');
		}

		let sign = req.headers[options.signatureHeader] || '';
		if (options.secret && !sign) {
			return reportError('No signature found in the request');
		}

		if (!req.body) {
			return reportError('Make sure body-parser is used');
		}

		// verify signature (if any)
		if (options.secret && !verifySignature(options.secret, JSON.stringify(req.body), sign, options.signData)) {
			return reportError('Failed to verify signature');
		}

		// parse payload 
		let payloadData = req.body;

		// was parsing repo id here when it was just for github
		// var repo = payloadData.repository && payloadData.repository.name;

		// emit events
		githookHandler.emit('*', event, payloadData);
		githookHandler.emit(event, payloadData);

		// if (repo) {
		// 	githookHandler.emit(repo, event, payloadData);
		// }

		res.status(200).send({
			success: true
		});
	}
};

/**
 * Module exports
 */
module.exports = GithubWebhook;
