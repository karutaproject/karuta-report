## About
The current report code in the web browser can take some time to run on big reports. This daemon pre-process specified reports at specified time to cut off the wait for a result, there's still the possibility to ask the report to be generated on the spot but you'll have to wait for it.

## How to install

On Debian 8 :
>curl -sL https://deb.nodesource.com/setup_4.x | bash -<br>
>apt-get install nodejs<br>
>ln -s /usr/lib/node_modules /usr/local/node_modules<br>
>npm install -g node-static<br>
>npm install -g request<br>
>npm install -g jsdom<br>
>npm install -g xmldom<br>
>npm install -g jquery<br>


## How to use
Create a service account in karuta, if possible with a randomly generated login and password and fill the 'access' file, ensure that reading the content is not permitted for everyone on the system

To run the daemon
>node main.js

In the browser
>http://localhost:8081/client/config.html

[screenshot]

## TODO
- Backport the report code and ensure that it is compatible with a browser
- Configuration when the service is running on another computer different from the backend
