(function (window, document, navigator) {
  function init(collector, cookieSizeThreshold) {
    if (typeof collector !== "string") {
      collector = "/collect";
    }
    if (typeof cookieSizeThreshold !== "number") {
      cookieSizeThreshold = 0;
    }

    // Generate a random ID to identify this specific instantiation of the
    // script so we can tie together cookies set set in the lifetime of the same
    // "page"
    var viewId =
      Math.floor(Math.random() * 0x7fffffff) +
      "." +
      Math.floor(Date.now() / 1000);

    // The URL and user-agent string so they can be included with the reports for context
    var viewUrl = window.location.href;
    var viewUserAgent = navigator.userAgent;

    // Dictionary of all the reports of cookies by name
    var cookieNameSet = {};

    function sendReports(eventType) {
      var reports = [];
      // Patching the document.cookie may not have been possible in old browsers or
      // cookies may have been set in other contexts since the script was
      // initialized. Report these but mark them as not intercepted.
      document.cookie.split(";").forEach(function (cookie) {
        var cookieParts = cookie.trim().split("=");
        var cookieName = cookieParts[0];
        if (!(cookieName in cookieNameSet)) {
          // Add a report to be sent
          cookieNameSet[cookieName] = {
            name: cookieName,
            size: cookie.length,
            attributes: null,
            source: null,
            intercepted: false,
          };
        }
      });

      // Collect all the reports
      var cookieNames = Object.getOwnPropertyNames(cookieNameSet);
      for (var index = 0; index < cookieNames.length; index++) {
        var cookieName = cookieNames[index];
        var report = cookieNameSet[cookieName];
        if (report) {
          // Only report cookies larger than the given threshold
          if (report.size > cookieSizeThreshold) {
            reports.push(report);
          }
          // Set the cookie name to false so it's not reported again
          cookieNameSet[cookieName] = false;
        }
      }

      var collectorUrl = collector + "?view=" + viewId;
      // Only send the request if there are any cookies to report
      if (reports.length > -1) {
        var data = {
          viewId: viewId,
          viewUrl: viewUrl,
          viewUserAgent: viewUserAgent,
          reports: reports,
          eventType: eventType,
        };

        // Try to use the Beacon API, fall back to XHR if its not available
        if (navigator.sendBeacon) {
          navigator.sendBeacon(collectorUrl, JSON.stringify(data));
        } else {
          var xhr = new (window.XDomainRequest || window.XMLHttpRequest)();
          xhr.open("POST", collectorUrl, false);
          xhr.withCredentials = false;
          xhr.send(JSON.stringify(data));
        }
      }
    }

    // Create handler function for assignments to document.cookie
    function createSetCookie(cookiePropertyDescriptor) {
      return function setCookie(cookie) {
        try {
          // Try to use the stack to grab the URL of the script that is trying
          // to set the cookie.
          var error = new Error();
          if (error.stack && Error.captureStackTrace) {
            Error.captureStackTrace(error, setCookie);
          }
          var stack = error.stack || null;
          var source = null;
          if (stack) {
            var match = stack.match(/https?\:\/\/[^\/]+[^:]*(\:\d+){2}/i);
            if (match) {
              // Find the first URL
              source = match[0];
            } else {
              // Find first line containing "://"
              source =
                stack.split("\n").find(function (frame) {
                  frame.indexOf("://") !== -1;
                }) || null;
            }
          }

          // Parse the cookie to get the name and any value or attributes
          var cookieParts = cookie.match(/([^=;]+)(=[^;]+)?(;.*)?/);
          var cookieName = cookieParts[1];
          var cookieValue = cookieParts[2] || "";
          var cookieAttributes = cookieParts[3] || "";
          var cookieSize = cookieName.length + cookieValue.length;
          var report = cookieNameSet[cookieName];

          // Add new reports and overwrite smaller ones;
          if (
            !(cookieName in cookieNameSet) ||
            (report && report.size < cookieSize)
          ) {
            // Add the report
            cookieNameSet[cookieName] = {
              name: cookieName,
              size: cookieSize,
              attributes: cookieAttributes,
              source: source,
              intercepted: true,
            };
          }

          // Return here to disable big cookies being set or alternatively push
          // them to local storage and intercept the "get" to re-populate them too.
        } catch (e) {
          if (window.console && window.console.error) {
            console.error(e);
          }
        }

        // Call the original assignment
        cookiePropertyDescriptor.set.call(document, cookie);
      };
    }

    // Record cookies that are already present when the script is initialized
    document.cookie.split(";").forEach(function (pair) {
      cookieNameSet[pair.trim().split("=")[0]] = false;
    });

    // Intercept subsequent assignments to document.cookie
    var cookiePropertyDescriptor =
      Object.getOwnPropertyDescriptor(Document.prototype, "cookie") ||
      Object.getOwnPropertyDescriptor(HTMLDocument.prototype, "cookie");
    // Try to patch document.cookie (doesn't work for old safari versions)
    if (cookiePropertyDescriptor && cookiePropertyDescriptor.configurable) {
      Object.defineProperty(document, "cookie", {
        get: cookiePropertyDescriptor.get,
        set: createSetCookie(cookiePropertyDescriptor),
      });
    }

    // Capture when the user moves away from the page and
    // send reports
    if (typeof document.visibilityState === "undefined") {
      // Page Visibility API is not supported
      // Old browsers - fall back to the beforeunload event
      window.addEventListener("beforeunload", function (event) {
        sendReports(event.type);
      });
    } else {
      // Page Visibility API is supported
      // Modern browsers - Use the page visibility API to send reports when the page
      // is hidden. This occurs when navigating away from a page but also
      // supports mobile interactions where the tab is "frozen".
      document.addEventListener("visibilitychange", function (event) {
        if (document.visibilityState === "hidden") {
          sendReports(event.type);
        }
      });
    }

    // Work around Safari-specific bugs.
    // Detect safari because the visibilityApi only works sometimes
    var isSafari =
      // mobile
      (window.navigator.userAgent.match(/iP(ad|od|hone)/i) &&
        navigator.vendor == "Apple Computer, Inc.") ||
      // desktop
      "safari" in window;

    if (isSafari) {
      var safariTimeout;

      // The visibilitychange event doesn't fire when navigating away, but
      // pagehide does (on mobile).
      window.addEventListener(
        "pagehide",
        function (event) {
          clearTimeout(safariTimeout);
          sendReports(event.type);
        },
        true
      );

      // It's preferable for the report to be sent by pagehide or
      // visibilitychange event handler but this doesn't reliably fire (on
      // desktop) so fallback to using beforeunload. If pagehide fires, it occurs
      // immediately *after* beforeunload Cancel the timeout that was set in
      // the beforeunload handler and send the report in the
      // pagehide handler instead.
      window.addEventListener("beforeunload", function (event) {
        safariTimeout = setTimeout(function () {
          if (
            !event.defaultPrevented &&
            typeof event.returnValue !== "string"
          ) {
            sendReports(event.type);
          }
        }, 0);
      });
    }
  }

  // Name the initialization function on the global (window) scope
  window["reportCookies"] = init;
})(window, document, navigator);
