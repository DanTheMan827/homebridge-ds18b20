# homebridge-ds18b20
This is a plugin for the DS18B20 temperature sensors.

Installation
--------------------
    sudo npm install -g homebridge-ds18b20

Sample HomeBridge Configuration
--------------------
    {
      "bridge": {
        "name": "HomeBridge",
        "username": "CC:22:3D:E3:CE:30",
        "port": 51826,
        "pin": "031-45-154"
      },
    
      "description": "",
    
      "accessories": [
        {
          "accessory": "DS18B20",
          "name": "Temperature Sensor",
          "device": "28-0000063f4ead"
        }
      ],
    
      "platforms": []
    }
