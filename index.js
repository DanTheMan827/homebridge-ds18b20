"use strict";

var fs = require('fs');

var Service, Characteristic;
var temperatureService;

module.exports = function (homebridge)
  {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-temperature-ds18b20", "DS18B20", TemperatureAccessory);
  }

function TemperatureAccessory(log, config)
  {
  this.log = log;
  this.name = config["name"];
  this.deviceName = config["device"];
  this.lastupdate = 0;
  this.log("TemperatureAccessory : " + config["device"]);
  }

TemperatureAccessory.prototype =
  {
  getState: function (callback)
    {
    // Only fetch new data once per minute
    if (this.lastupdate + 60 < (Date.now() / 1000 | 0))
    {
      var devicePath = '/mnt/1wire/' + this.deviceName + '/temperature';
      if (fs.existsSync(devicePath)) {
        var data = fs.readFileSync(devicePath, 'utf8');
        if (typeof data == 'undefined') { return this.log("Failed to read temperature file"); }
        this.temperature = (0.0+parseFloat(data));
        this.log(devicePath + " at " + this.temperature);
      }
      else
      {
        this.log(devicePath + " not found ! " );
        //this.temperature = "";
      }
    temperatureService.setCharacteristic(Characteristic.CurrentTemperature, this.temperature);
    callback(null, this.temperature);
    }
   
    },

  identify: function (callback)
    {
    this.log("Identify requested!");
    callback(); // success
    },

  getServices: function ()
    {
    var informationService = new Service.AccessoryInformation();

    var data = fs.readFileSync('/proc/cpuinfo', 'utf8');
    if (typeof data == 'undefined') { return this.log("Failed to read /proc/cpuinfo"); }
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "Dallas")
      .setCharacteristic(Characteristic.Model, "")
      .setCharacteristic(Characteristic.SerialNumber, this.deviceName);

    temperatureService = new Service.TemperatureSensor(this.name);
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getState.bind(this));

    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({minValue: -30});
        
    temperatureService
      .getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({maxValue: 120});

    return [informationService, temperatureService];
    }
  };

if (!Date.now)
  {
  Date.now = function() { return new Date().getTime(); }
  }
