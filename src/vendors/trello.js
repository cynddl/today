/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS201: Simplify complex destructure assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// NOTE: The client library expects that jQuery has already been included,
// and that there is an "opts" variable (this is created automatically)
// when there is a request to client.js?key=...&token=...
//
// The expected options are:
//   version - The API version
//   apiEndpoint - The URL that API calls should go to (e.g. https://api.trello.com)
//   authEndpoint - The URL the authentication requests should go to (e.g. https://trello.com)
//   key - the application key to use in API requests.  This is set automatically when using <script src=".../client.js?key=..."
//   token - Optional.  The token to use in API requests.  This is set automatically when using <script src=".../client.js?key=...&token=..."

import jquery from 'jquery';
var $ = jquery;
var jQuery = jquery;

const wrapper = function(window, jQuery, opts) {
  let readStorage, writeStorage;

  let { key, token, apiEndpoint, authEndpoint, intentEndpoint, version } = opts;

  const baseURL = `${ apiEndpoint }/${ version }/`;
  const { location } = window;

  var Trello = {
    version() { return version; },

    key() { return key; },
    setKey(newKey) {
      key = newKey;
    },

    token() { return token; },
    setToken(newToken) {
      token = newToken;
    },

    // Issue a REST call to the API
    //
    // .rest(method, path, params, success, error)
    // .rest(method, path, success, error)
    //
    // method - The HTTP method to use/simulate (e.g. GET, POST, PUT, DELETE)
    // path - The API path to use (e.g. "members/me")
    // params - Optional.  A hash of values to include in the querystring/body (e.g. { filter: "open", fields: "name,desc" })
    // success - Function to call when the request succeeds
    // error - Function to call when the request fails
    rest(method, ...args) {
      const [path, params, success, error] = Array.from(parseRestArgs(args));

      opts = {
        url: `${ baseURL }${ path }`,
        type: method,
        data: {},
        dataType: "json",
        success,
        error
      };

      // Only include the key if it's been set to something truthy
      if (key) {
        opts.data.key = key;
      }
      // Only include the token if it's been set to something truthy
      if (token) {
        opts.data.token = token;
      }

      if (params != null) {
        $.extend(opts.data, params);
      }

      return $.ajax(opts);
    },

    // Has Trello been authorized to issue requests on a user's behalf?
    authorized() { return (token != null); },

    // Clear any existing authorization
    deauthorize() {
      token = null;
      writeStorage("token", token);
    },

    // Request a token that will allow us to make API requests on a user's behalf
    //
    // opts =
    //   type - "redirect" or "popup"
    //   name - Name to display
    //   persist - Save the token to local storage?
    //   interactive - If false, don't redirect or popup, only use the stored token, if one exists
    //   scope - The permissions we're requesting
    //   expiration - When we want the requested token to expire ("1hour", "1day", "30days", "never")
    authorize(userOpts) {

      opts = $.extend(true, {
        type: "redirect",
        persist: true,
        interactive: true,
        scope: {
          read: true,
          write: false,
          account: false
        },
        expiration: "30days"
      }
      , userOpts);

      const regexToken = /[&#]?token=([0-9a-f]{64})/;

      const persistToken = function() {
        if (opts.persist && (token != null)) {
          return writeStorage("token", token);
        }
      };

      if (opts.persist) {
        if (token == null) { token = readStorage("token"); }
      }

      if (token == null) { token = __guard__(regexToken.exec(location.hash), x => x[1]); }

      if (this.authorized()) {
        persistToken();
        location.hash = location.hash.replace(regexToken, "");
        return (typeof opts.success === 'function' ? opts.success() : undefined);
      }

      // If we aren't in interactive mode, and we didn't get the token from
      // storage or from the hash, then we error out here
      if (!opts.interactive) {
        return (typeof opts.error === 'function' ? opts.error() : undefined);
      }

      const scope = ((() => {
        const result = [];
        for (let k in opts.scope) {
          const v = opts.scope[k];
          if (v) {
            result.push(k);
          }
        }
        return result;
      })()).join(",");

      switch (opts.type) {
        case "popup":
          (function() {
            waitUntil("authorized", isAuthorized => {
              if (isAuthorized) {
                persistToken();
                return (typeof opts.success === 'function' ? opts.success() : undefined);
              } else {
                return (typeof opts.error === 'function' ? opts.error() : undefined);
              }
            });

            const width = 420;
            const height = 470;
            const left = window.screenX + ((window.innerWidth - width) / 2);
            const top = window.screenY + ((window.innerHeight - height) / 2);

            const origin = __guard__(new RegExp(`^[a-z]+://[^/]*`).exec(location), x1 => x1[0]);
            const authWindow = window.open(authorizeURL({ return_url: origin, callback_method: "postMessage", scope, expiration: opts.expiration, name: opts.name}), "trello", `width=${ width },height=${ height },left=${ left },top=${ top }`);

            var receiveMessage = function(event) {
              if ((event.origin !== authEndpoint) || (event.source !== authWindow)) { return; }

              if (event.source != null) {
                event.source.close();
              }

              if ((event.data != null) && /[0-9a-f]{64}/.test(event.data)) {
                token = event.data;
              } else {
                token = null;
              }

              if (typeof window.removeEventListener === 'function') {
                window.removeEventListener("message", receiveMessage, false);
              }
              isReady("authorized", Trello.authorized());
            };

            // Listen for messages from the auth window
            return (typeof window.addEventListener === 'function' ? window.addEventListener("message", receiveMessage, false) : undefined);
          })();
          break;
        default:
          // We're leaving the current page now; but the user should be calling .authorize({ interactive: false })
          // on page load
          window.location = authorizeURL({ redirect_uri: location.href, callback_method: "fragment", scope, expiration: opts.expiration, name: opts.name});
      }

    },

    // Request that a card be created, using the provided name, description, and
    // url.  This
    //
    // opts =
    //   name - The name to use for the card
    //   desc - The description to use for the card (optional)
    //   url - A url to attach to the card (optional)
    //
    // next = a method to be called once the card has been created.  The method
    // should take two arguments, an error and a card.  If next is not defined
    // then a promise that resolves to the card will be returned.
    addCard(options, next) {
      const baseArgs = {
        mode: 'popup',
        source: key || window.location.host
      };

      const getCard = function(callback) {
        var returnUrl = function(e) {
          window.removeEventListener('message', returnUrl);
          try {
            const data = JSON.parse(e.data);
            if (data.success) {
              return callback(null, data.card);
            } else {
              return callback(new Error(data.error));
            }
          } catch (error) {}
        };

        if (typeof window.addEventListener === 'function') {
          window.addEventListener('message', returnUrl, false);
        }

        const width = 500;
        const height = 600;
        const left = window.screenX + ((window.outerWidth - width) / 2);
        const top = window.screenY + ((window.outerHeight - height) / 2);

        return window.open(intentEndpoint + "/add-card?" + $.param($.extend(baseArgs, options)), "trello", `width=${ width },height=${ height },left=${ left },top=${ top }`);
      };

      if (next != null) {
        return getCard(next);
      } else if (window.Promise) {
        return new Promise(function(resolve, reject) {
          return getCard(function(err, card) {
            if (err) {
              return reject(err);
            } else {
              return resolve(card);
            }
          });
        });
      } else {
        return getCard(function() {});
      }
    }
  };

  // Hook up some convenience methods for HTTP methods
  //
  // Trello.get(path, params, success, error)
  // Trello.put(path, params, success, error)
  // Trello.post(path, params, success, error)
  // Trello.delete(path, params, success, error)
  for (let type of ["GET", "PUT", "POST", "DELETE"]) {
    (type => Trello[type.toLowerCase()] = function() { return this.rest(type, ...arguments); })(type);
  }

  // Provide another alias for Trello.delete, since delete is a keyword in javascript
  Trello.del = Trello.delete;

  // Hook up convenience methods for the different collections
  // e.g. Trello.cards(id, params, success, error)
  for (let collection of ["actions", "cards", "checklists", "boards", "lists", "members", "organizations", "lists"]) {
    (collection =>
      Trello[collection] = {
        get(id, params, success, error) {
          return Trello.get(`${ collection }/${ id }`, params, success, error);
        }
      }
    )(collection);
  }

  window.Trello = Trello;

  var authorizeURL = function(args) {
    const baseArgs = {
      response_type: "token",
      key
    };

    return authEndpoint + "/" + version + "/authorize?" + $.param($.extend(baseArgs, args));
  };

  var parseRestArgs = function(...args) {
    let [path, params, success, error] = Array.from(args[0]);
    if (isFunction(params)) {
      error = success;
      success = params;
      params = {};
    }

    // Get rid of any leading /
    path = path.replace(new RegExp(`^/*`), "");

    return [path, params, success, error];
  };

  const { localStorage } = window;

  if (localStorage != null) {
    const storagePrefix = "trello_";
    readStorage = key => localStorage[storagePrefix + key];
    writeStorage = function(key, value) {
      if (value === null) {
        return delete localStorage[storagePrefix + key];
      } else {
        try {
          return localStorage[storagePrefix + key] = value;
        } catch (error) {}
      }
    };
  } else {
    readStorage = (writeStorage = function() {});
  }

  return Trello;

};

const deferred = {};
const ready = {};

var waitUntil = function(name, fx) {
  if (ready[name] != null) {
    return fx(ready[name]);
  } else {
    return (deferred[name] != null ? deferred[name] : (deferred[name] = [])).push(fx);
  }
};

var isReady = function(name, value) {
  ready[name] = value;
  if (deferred[name]) {
    const fxs = deferred[name];
    delete deferred[name];
    for (let fx of Array.from(fxs)) { fx(value); }
  }
};

var isFunction = val => typeof val === "function";

var opts={"version":1,"apiEndpoint":"https://api.trello.com","authEndpoint":"https://trello.com","intentEndpoint":"https://trello.com", "key":"730a251ecf86178cf7a87fc6da917264"};
var Trello = wrapper(window, jQuery, opts);
export {Trello};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
