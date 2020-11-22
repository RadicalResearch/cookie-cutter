(function (window, document, navigator, cookieSizeThreshold, collector) {
  var viewId =
    Math.floor(Math.random() * 0x7fffffff) +
    "." +
    Math.floor(Date.now() / 1000);
  var viewUrl = window.location.href;
  var viewUserAgent = navigator.userAgent;
  var cookieNameSet = {};
  var patched = false;

  // Send reports
  function sendReports() {
    var reports = [];
    if (!patched) {
      document.cookie.split(";").forEach(function (cookie) {
        var cookieParts = cookie.split("=");
        var cookieName = cookieParts[0];
        if (!(cookieName in cookieNameSet)) {
          var report = {
            name: cookieName,
            size: cookie.length,
            attributes: null,
            source: null,
          };
          cookieNameSet[cookieName] = report;
        }
      });
    }

    var cookieNames = Object.getOwnPropertyNames(cookieNameSet);
    for (var index = 0; index < cookieNames.length; index++) {
      var cookieName = cookieNames[index];
      if (cookieNameSet[cookieName]) {
        reports.push(cookieNameSet[cookieName]);
        cookieNameSet[cookieName] = false;
      }
    }

    var collectorUrl = collector + "?view=" + viewId;
    if (reports.length > 0) {
      var data = {
        viewId: viewId,
        viewUrl: viewUrl,
        viewUserAgent: viewUserAgent,
        reports: reports,
      };

      if (navigator.sendBeacon) {
        navigator.sendBeacon(collectorUrl, JSON.stringify(data));
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", collectorUrl, false);
        xhr.withCredentials = false;
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(data));
      }
    }
  }

  // Intercept cookie setting and store reports of big cookies being set
  function createSetCookie(cookiePropertyDescriptor) {
    return function setCookie(cookie) {
      console.log("set cookie", cookie);
      try {
        var error = new Error();
        if (error.stack && Error.captureStackTrace) {
          Error.captureStackTrace(error, setCookie);
        }
        var stack = error.stack;
        var source = "";
        if (typeof stack === "string") {
          var match = stack.match(/https?\:\/\/[^\:]+(\:\d+){2}/i);
          if (match) {
            source = match[0];
          } else {
            source = stack.split("\n").find(function (frame) {
              frame.indexOf("://") !== -1;
            });
          }
        } else {
          source = stack.toString();
        }

        var cookieParts = cookie.match(/([^=;]+)(=[^;]+)?(;.*)?/);
        var cookieName = cookieParts[1];
        var cookieValue = cookieParts[2] || "";
        var cookieAttributes = cookieParts[3] || "";

        if (cookieValue.length > cookieSizeThreshold) {
          // Ignore cookies that have already been seen.
          if (!(cookieName in cookieNameSet)) {
            var report = {
              name: cookieName,
              size: cookieName.length + cookieValue.length,
              attributes: cookieAttributes,
              source: source,
            };
            cookieNameSet[cookieName] = report;
          }

          // Return here to disable big cookies being set or alternatively push
          // them to local storage and intercept the "get" to re-populate them too.
        }
      } catch (e) {
        // Something went wrong
        console.log(e);
      }

      cookiePropertyDescriptor.set.call(document, cookie);
    };
  }

  // Proxy cookie calls
  var cookiePropertyDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(document),
    "cookie"
  );
  // Try to patch document.cookie (doesn't work for old safari versions)
  if (cookiePropertyDescriptor && cookiePropertyDescriptor.configurable) {
    Object.defineProperty(document, "cookie", {
      get: cookiePropertyDescriptor.get,
      set: createSetCookie(cookiePropertyDescriptor),
    });
    patched = true;
  } else {
    // Can't proxy document.cookie, fall back to diffing.
    document.cookie.split(";").forEach(function (pair) {
      // Mark all the existing cookies
      cookieNameSet[pair.split("=")[0]] = false;
    });
  }

  // Apply event handler to send reports
  if (typeof window.safari === "object") {
    // Work around Safari-specific bugs.
    var safariTimeout;
    if ("onpagehide" in window) {
      window.addEventListener("pagehide", function () {
        clearTimeout(safariTimeout);
        sendReports();
      });
    }
    window.addEventListener("beforeunload", function (event) {
      safariTimeout = setTimeout(function () {
        if (!(event.defaultPrevented || event.returnValue.length > 0)) {
          sendReports();
        }
      }, 0);
    });
  } else {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        sendReports();
      }
    });
  }
})(
  window,
  document,
  navigator,
  5, // Cookie Size Threshold
  "http://collect.example.org:8080/collect" // HTTP report collector endpoint
);
