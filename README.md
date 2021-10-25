## About
The current report code in the web browser can take some time to run on big reports. This daemon pre-process specified reports at specified time to cut off the wait for a result, there's still the possibility to ask the report to be generated on the spot but you'll have to wait for it.

## How to install
Installing node-js itself
>apt-get install npm

Installing service manager
>npm install -g pm2

Installing dependencies:<br>
Inside the karuta-report folder
>npm install

Dependencies for Chrome-headless
>apt-get install libgbm-dev libatk1.0 libatk-bridge2.0-0 libxkbcommon0 libxdamage1 libpango1.0 

## How to use
Create a service account in karuta, if possible with a randomly generated login and password and fill the 'access' file, ensure that reading the content is not permitted for everyone on the system

To run the daemon
>pm2 start main.js

In the browser
>http://localhost:8081/client/config.html

[screenshot]

## TODO
- Backport the report code and ensure that it is compatible with a browser
- Configuration when the service is running on another computer different from the backend
