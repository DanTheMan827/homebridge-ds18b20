var ds18b20 = require("ds18b20-raspi");
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory(
    "homebridge-temperature-ds18b20",
    "DS18B20",
    TemperatureAccessory
  );
};

function TemperatureAccessory(log, config) {
  this.log = log;
  this.name = config["name"];
  this.device = config["device"];
  this.pollInterval = config["pollInterval"];
  this.offsetC = config["offsetC"] || 0;

  this.service = new Service.TemperatureSensor(this.name);

  this.service
    .getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({ minValue: -100, maxValue: 125 })
    .on("get", this.getState.bind(this));

  if (pollInterval) {
    setInterval(
      function() {
        ds18b20.readC(this.device, 2, function(err, value) {
          if (!err) {
            this.service
              .getCharacteristic(Characteristic.CurrentTemperature)
              .updateValue(value);
          }
        });
      }.bind(this),
      this.pollInterval
    );
  }
}

TemperatureAccessory.prototype.getState = function(callback) {
  ds18b20.readC(this.device, 2, function(err, value) {
    if (!err) {
      callback(null, value + this.offsetC);
    } else {
      callback(err);
    }
  });
};
TemperatureAccessory.prototype.getServices = function() {
  return [this.service];
};
