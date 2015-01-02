var MemoryStream = require("io").MemoryStream;
var objects = require("common-utils/objects");

var CODES = {
  GET:200,
  HEAD:200,
  POST:201,
  PUT:200,
  DELETE:204
};
var EXPIRES = new Date(0).toUTCString();

function headers() {
  return {
    "Content-Type":"application/json",
    "Pragma":"no-cache",
    "Cache-Control":["no-cache", "no-store"],
    "Expires":EXPIRES
  };
}

function requestUrl(request) {
  // TODO handle case when we're behind a proxy
  return request.scheme + '://' + request.host
    + (request.port === 80 ? '' : ':' + request.port) + request.scriptName
    + request.pathInfo;
}

function response(request, body) {
  var r = [JSON.stringify(body)];
  if (request.queryParams) {
    var callback = request.queryParams.callback;
    if (callback) {
      r.unshift(callback, '(');
      r.push(');');
    }
  }
  return r;
}

exports.middleware = function(next, app) {
  app.json = {};
  return function(request) {
    var body = request.input.read().decodeToString();
    if (body) {
      try {
        request.body = JSON.parse(body);
      } catch (e) {
        return {
          status:400,
          headers:headers(),
          body:response(request, {
            error:400,
            reason:e.message
          })
        };
      }
    }
    try {
      var result = next(request);
      if (result.status && result.headers && result.body) {
        return result;
      }
      var h = headers();
      if (result.headers && result.response) {
        h = objects.merge(h, result.headers);
        result = result.response;
      }
      if (request.method === "POST") {
        h = objects.merge(h, {
          "Location":requestUrl(request) + '/' + result[app.json.id]
        });
      }
      return {
        status:CODES[request.method],
        headers:h,
        body:result && request.method !== "HEAD" ? response(request, result) : []
      };
    } catch (e) {
      // TODO update this not to use Error, but something else throwable instead
      if (e.notfound) {
        return {
          status:404,
          headers:headers(),
          body:response(request, {
            error:"notfound"
          })
        };
      } else if (e.message === 'invalid') {
        return {
          status:400,
          headers:headers(),
          body:response(request, {
            error:"invalid"
          })
        };
      } else if (e.message === 'unauthorized') {
        return {
          status:401,
          headers:headers(),
          body:response(request, {
            error:"unauthorized"
          })
        };
      } else {
        console.warn(e.message);
        return {
          status:503,
          headers:headers(),
          body:response(request, {
            error:503,
            reason:e.message
          })
        };
      }
    }
  };
};

exports.multiget = function(app) {
  return function(request) {
    return request.queryParams.requests.split(',').map(function(uri) {
      uri = uri.split('?');
      return JSON.parse(app({
        method:'GET',
        pathInfo:uri[0],
        queryString:uri[1] || '',
        headers:request.headers,
        input:new MemoryStream(''),
        params:{},
        env:{
          servletRequest:{
            getCharacterEncoding:function() {
              return null;
            }
          }
        }
      }).body);
    });
  };
};