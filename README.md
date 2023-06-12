# workTimer

Simple timer for task followup while working. 

## Features

* Start, stop, and edit task timers.
* Computed total of all timers.
* Multiple days history.

Data is saved in browser and can be exported to json.

### Planned

* Notification for breaks
* Notification to finish day

## Compile

npm install --global web-ext
web-ext sign --api-key=<JWT issuer> --api-secret=<JWT secret>

## Built With

Started from [beastify demo](https://github.com/mdn/webextensions-examples/tree/main/beastify) and made with:

* [Pico.css](https://picocss.com)
* [Mustache.js](https://github.com/janl/mustache.js)
