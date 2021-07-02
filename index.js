var ds18b20 = require("ds18b20-raspi");
var Service, Characteristic, FakeGatoHistoryService, loggingService;
var Logger = require("mcuiot-logger").logger;
const moment = require('moment');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  FakeGatoHistoryService = require('fakegato-history')(homebridge);
  homebridge.registerAccessory(
    "homebridge-ds18b20",
    "DS18B20",
    TemperatureAccessory
  );
};

function TemperatureAccessory(log, config) {
  this.log = log;
  this.log("Adding Accessory");
  this.name = config["name"];
  this.device = config["device"];
  this.pollInterval = config["pollInterval"];
  this.offsetC = config["offsetC"] || 0;
  this.spreadsheetId = config['spreadsheetId'];
  this.log_event_counter = 59;
  if (this.spreadsheetId) {
    this.logger = new Logger(this.spreadsheetId);
  }

  this.service = new Service.TemperatureSensor(this.name);

  this.service
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({ minValue: -100, maxValue: 125 })
    .on("get", this.getState.bind(this));

  if (this.pollInterval) {
    setInterval(
      function() {
        ds18b20.readC(this.device, 2, function(err, value) {
          if (!err) {
            this.service
              .getCharacteristic(Characteristic.CurrentTemperature)
              .updateValue(value + this.offsetC);
          }
        }.bind(this));
      }.bind(this),
      this.pollInterval
    );
  }
}

TemperatureAccessory.prototype.getState = function(callback) {
  ds18b20.readC(this.device, 2, function(err, value) {
    if (!err) {
      callback(null, value + this.offsetC);
      this.log("DS18b20 Temperature: %s°C", roundInt(value + this.offsetC));
      this.log_event_counter = this.log_event_counter + 1;
        if (this.log_event_counter > 59) {
          if (this.spreadsheetId) {
            this.logger.storeDS(this.name, roundInt(value + this.offsetC));
          }
          this.log_event_counter = 0;
        }

        this.loggingService.addEntry({
          time: moment().unix(),
          temp: roundInt(value + this.offsetC),
        });
    } else {
      callback(err);
    }
  }.bind(this));
};
TemperatureAccessory.prototype.getServices = function() {
  this.log("INIT: %s", this.name);

  var informationService = new Service.AccessoryInformation();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, "DS18B20")
    .setCharacteristic(Characteristic.Model, this.service)
    .setCharacteristic(Characteristic.SerialNumber, "18B20-" + this.name)
    .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

  this.service.log = this.log;
  this.loggingService = new FakeGatoHistoryService("weather", this.service, {
    storage: this.storage,
    minutes: this.refresh * 10 / 60
  });

  return [this.service, informationService, loggingService];
};

function roundInt(string) {
  return Math.round(parseFloat(string) * 10) / 10;
}