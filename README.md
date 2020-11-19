# Cookie Cutter

Intercept scripts setting first-party cookies. Report on the cookies being set
and potentially store them with an alternative mechanism (like local storage) or
disregard the cookie entirely.

A plethora of different third-party and first-party javascript now commonly runs
on most websites. Each of these scripts having their own motivations for
persisting values in cookies. The cumulative effect of this ecosystems setting
cookies on the same domain can have deleterious effects. The size of the cookies
build up over time and can result in bloated HTTP request headers.

With ad-networks and yag managers often loading scripts indirectly from any
number of other sources it can be difficult to have a clear view of what scripts
are responsible for setting what cookies, and consequently make decisions or
take action about how to control these cookies.

This is an experimental solution to getting a clearer view of what scripts are
setting what cookies. It may also provide a potential mechanism for proactively
mitigating the problem of bloated use of cookies.

### How it works

A javascript patches the `document.cookie` property used by other scripts to set
cookies. It then intercepts assignments of cookies to gathers a reports of the
size, name and, importantly, the javascript file that was responsible for
setting the cookie. These reports can then collected in a central location and
reviewed to determine what action should be taken to address the scripts that
are responsible for setting unwanted cookies.

With this report it would, potentially be possible to update the same script to
disregard or provide alternative provision for cookies that were not deemed
necessary.
