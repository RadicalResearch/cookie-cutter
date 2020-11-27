# Cookie Report

**Notice:** _This service is currently experimental. It should not be considered
production-ready._

Capture reports of cookies being set by third-party scripts.

A plethora of different third-party and first-party javascript now commonly runs
on most websites. Each of these scripts having their own motivations for
persisting values in cookies. The cumulative effect of these cookies all being
set on the same domain can have deleterious effects. The size of the cookies
build up over time and can result in bloated HTTP request headers.

With ad-networks and tag managers often loading scripts indirectly from any
number of other sources it can be difficult get a clear view of what scripts are
responsible for setting what cookies, and consequently make decisions about how
to control these cookies.

This is an experimental solution to getting a clearer view of what scripts are
setting cookies. It may also provide a potential mechanism for proactively
mitigating the problem of bloated use of cookies.

### How it works

Javascript patches the `document.cookie` property used by other scripts to set
cookies. It then intercepts assignments of cookies to gathers a reports of the
size, name and the javascript file that was responsible for setting the cookie.
These reports are sent using the sendBeacon API when the user navigates away
from the page. The reports can then be collected in a central location and
reviewed to determine what action should be taken to address the scripts that
are responsible for setting unwanted cookies.

## Installation and Usage

To install you can include the client script as part of your page so it runs
before cookies are set by other scripts.

Install the NPM package

```bash
npm install --save @radical-research/cookie-report
```

Setup the client script

```javascript
// Reference the client script - This defines the cookieReport function in global scope
require("@radical-research/cookie-report");

// Start capturing cookies
cookieReport();
```
