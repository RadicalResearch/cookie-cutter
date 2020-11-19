(function (window, document, navigator, cookieSizeThreshold, collector) {
  var cookieNameSet = {};

  // Send reports
  function sendReports() {
    var cookieNames = Object.getOwnPropertyNames(cookieNameSet);
    var reports = [];
    for (let index = 0; index < cookieNames.length; index++) {
      var cookieName = cookieNames[index];
      if (cookieNameSet[cookieName]) {
        reports.push(cookieNameSet[cookieName]);
        cookieNameSet[cookieName] = false;
      }
    }
    if (reports.length > 0 && navigator.sendBeacon) {
      navigator.sendBeacon(collector, JSON.stringify(reports));
    }
  }

  // Intercept cookie setting and store reports of big cookies being set
  function createSetCookie(cookiePropertyDescriptor) {
    return function setCookie(cookie) {
      try {
        var error = new Error();
        if (error.stack && Error.captureStackTrace) {
          Error.captureStackTrace(error, setCookie);
        }
        var stack = error.stack;
        var source = "";
        if (typeof stack === "string") {
          const match = stack.match(/https?\:\/\/[^\:]+(\:\d+){2}/i);
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
        var cookieValue = cookieParts[2] || cookieName;
        var cookieAttributes = cookieParts[3] || "";

        if (cookieValue.length > cookieSizeThreshold) {
          // Ignore cookies that have already been seen.
          if (!(cookieName in cookieNameSet)) {
            var report = {
              name: cookieName,
              size: cookieValue.length,
              attributes: cookieAttributes,
              source,
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
  var cookiePropertyDescriptor =
    Object.getOwnPropertyDescriptor(Document.prototype, "cookie") ||
    Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "cookie");
  if (cookiePropertyDescriptor && cookiePropertyDescriptor.configurable) {
    Object.defineProperty(document, "cookie", {
      get: cookiePropertyDescriptor.get,
      set: createSetCookie(cookiePropertyDescriptor),
    });
  }

  // Apply event handler to send reports
  if (
    typeof window.safari === "object" &&
    window.safari.pushNotification &&
    "onpagehide" in window
  ) {
    document.addEventListener("onpagehide", function () {
      console.log("onpagehide");
      sendReports();
    });
  } else {
    document.addEventListener("visibilitychange", function () {
      console.log("visibilitychange", document.visibilityState);
      if (document.visibilityState === "hidden") {
        sendReports();
      }
    });
  }
})(
  window,
  document,
  navigator,
  32, // Cookie Size Threshold
  "https://www.example.com/collect" // HTTP report collector endpoint
);
