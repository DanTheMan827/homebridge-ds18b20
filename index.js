var ds18b20 = require("ds18b20-raspi");
var Service, Characteristic, FakeGatoHistoryService;
var Logger = require("mcuiot-logger").logger;
const moment = require('moment');
var os = require("os");
var hostname = os.hostname();
var fs = require('fs');

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
  this.pollInterval = config["pollInterval"] || "60000";// Every minute
  this.offsetC = config["offsetC"] || 0;
  this.spreadsheetId = config['spreadsheetId'];
  this.storage = config['storage'] || "fs";
  this.service = config.service || "DS18B20";
  
  this.log_event_counter = 59;
  if (this.spreadsheetId) {
    this.logger = new Logger(this.spreadsheetId);
  }
}

TemperatureAccessory.prototype = {
  
  getState: function(callback) {
    ds18b20.readC(this.device, 2, function(err, value) {
      if (!err) {
        this.log("DS18b20 Temperature: %s°C", roundInt(value + this.offsetC));
        this.log_event_counter = this.log_event_counter + 1;
          if (this.log_event_counter > 59) {
            if (this.spreadsheetId) {
              this.logger.storeDHT(this.name, 0, roundInt(value + this.offsetC), 0);
            }
            this.log_event_counter = 0;
          }

          this.loggingService.addEntry({
            time: moment().unix(),
            temp: roundInt(value + this.offsetC)
          });

          callback(err, value + this.offsetC);
      } else {
        this.log.error("Error:", err);
        callback(err);
      }
    }.bind(this));
  },

  identify: function(callback) {
    this.log("Identify requested!");
    callback(); // success
  },

  getServices: function() {
    this.log("INIT: %s", this.name);

    var informationService = new Service.AccessoryInformation();

    informationService
      .setCharacteristic(Characteristic.Manufacturer, "DS18B20")
      .setCharacteristic(Characteristic.Model, this.service)
      .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name)
      .setCharacteristic(Characteristic.FirmwareRevision, require('./package.json').version);

      switch (this.service) {
        case "DS18B20":
          this.dsservice = new Service.TemperatureSensor(this.name);
          this.dsservice
            .getCharacteristic(Characteristic.CurrentTemperature)
            .setProps({ minValue: -100, maxValue: 125 })
            ;
            //.on("get", this.getState.bind(this));

          this.dsservice.log = this.log;
          this.loggingService = new FakeGatoHistoryService("weather", this.dsservice, {
              //size:4600,        // optional - if you still need to specify the length
              storage:'fs',
              //path:'/home/pi/homebridgedb/',  // if empty it will be used the -U homebridge option if present, or .homebridge in the user's home folder
              minutes: ((this.pollInterval/1000) * 10 / 60)
          });

          setInterval(function() {
            this.getState(function(err, value) {
                if (!err) {
                  this.dsservice
                    .getCharacteristic(Characteristic.CurrentTemperature)
                    .updateValue(value + this.offsetC);
                }
              }.bind(this));
            }.bind(this), this.pollInterval * 1);
          
        return [this.dsservice, informationService, this.loggingService];
      }
  }
};

function roundInt(string) {
  return Math.round(parseFloat(string) * 10) / 10;
}