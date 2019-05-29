# express-webhook-handler

To Use:
-------

**Make sure you use [body-parser](https://github.com/expressjs/body-parser) middleware for your Express app**

```javascript
var GithubWebHook = require('express-github-webhook');
var webhookHandler = GithubWebHook({ path: '/webhook', secret: 'secret' });

// use in your express app
let app = express();
app.use(bodyParser.json()); // must use bodyParser in express
app.use(webhookHandler); // use our middleware

// Now could handle following events
webhookHandler.on('*', function (event, data) {
});

webhookHandler.on('event', function (data) {
});

webhookHandler.on('error', function (err, req, res) {
});
```

Where **'event'** is the event name to listen to (sent by your webhook such as 'push').

**'error'** event is a special event, which will be triggered when something goes wrong in the handler (like failed to verify the signature).

Available options for creating handler are:

* path: the path for the callback, only request that matches this path will be handled by the middleware.
* secret (option): the secret used to verify the signature of the hook. If secret is set, then request without signature will fail the handler. If secret is not set, then the signature of the request (if any) will be ignored. [Read more](https://developer.github.com/webhooks/securing/)
* deliveryHeader (option): header name for the delivery ID, defaults to `x-github-delivery`
* eventHeader (option): header name for the event type, defaults to `x-github-event`
* signatureHeader (option): header name for the event signature, defaults to `x-hub-signature`
* signData (option): signature function used to compute and check event signatures, defaults to GitHub SHA1 HMAC signature. Will receive the secret and data to sign as arguments.


TODO
-----------
* Add support for content type of `application/x-www-form-urlencoded`
* Provide more available options


Modified from Gisonrg's [express-github-webhook](https://github.com/Gisonrg/express-github-webhook)

License
=======

[MIT](LICENSE)
