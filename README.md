# Proxy

Proxy intermediario entre las peticiones de los componentes de stock, weather y traffic. Permite
postear datos y almacenarlos en una cache. Solo se almacena un dato.

## Configuración

El proxy permite ser configurado a través de variables de entornos o del fichero del configuración. En caso de utilizar
variables de entorno, los nombres irán en mayusculas

| Variable  | Descripción                                              | Default             |
|-----------|----------------------------------------------------------|---------------------|
| port      | Puerto en el que va a ejecutar la aplicación             | 8080                |
| log_level | Nivel de logs que se van a registrar (DEBUG,INFO,ERROR)  | info                |
| host      | Dirección host que se utiliza al desplegar la aplicación | localhost           |
| log_file  | Fichero donde se guardará los logs de la aplicación      | logs/proxy-post.log |
| ssl_key   | Fichero de la clave para el certificado ssl para HTTPS   |                     |
| ssl_cert  | Fichero del certificado ssl para HTTPS                   |                     |

## Peticiones Genericas

### GET /fakes/:list

Lista los datos fake guardados para un determinado componente. `list` puede tomar valores de 
stock, weather o traffic

### GET /fakes/:list/clean

Elimina los datos fake de una determinada lista. `list` puede tomar valores de 
stock, weather o traffic

## WEATHER

### GET /weather

Devuelve los datos de tiempo para una determinada ciudad. Introduce los datos de fake
si existen


#### Params

| Parametro | Descripcion                                   |
|-----------|-----------------------------------------------|
| lat       | Latitud de la ciudad que se quiere consultar  |
| lon       | Longitud de la ciudad que se quiere consultar |
| units     | unidades en la que se quiere la respuesta     |
| lang      | Idioma de la información                      |
| appId     | app key de open weather para las peticiones   |

#### Response 200
```json
{
  "city": {
    "id": 2498541,
    "name": "Wilaya d’ El Bayadh",
    "coord": {
      "lon": 1.16667,
      "lat": 32.5
    },
    "country": "DZ",
    "population": 0,
    "sys": {
      "population": 0
    }
  },
  "cod": "200",
  "message": 0.0046,
  "cnt": 35,
  "list": [
    {
      "dt": 1485356400,
      "main": {
        "temp": 13.42,
        "temp_min": 10.27,
        "temp_max": 13.42,
        "pressure": 950.27,
        "sea_level": 1037.3,
        "grnd_level": 950.27,
        "humidity": 81,
        "temp_kf": 3.14
      },
      "weather": [
        {
          "id": 800,
          "main": "Clear",
          "description": "cielo claro",
          "icon": "01d"
        }
      ],
      "clouds": {
        "all": 0
      },
      "wind": {
        "speed": 2.57,
        "deg": 299.002
      },
      "sys": {
        "pod": "d"
      },
      "dt_txt": "2017-01-25 15:00:00"
    },...
  ]
}
```
#### Response 400
```json
{
  "cod": 401,
  "message": "Invalid API key. Please see http://openweathermap.org/faq#error401 for more info."
}
```
### POST /weather

Introduce datos en la cache de weather

#### Params
| Parametro | Descripcion                          |
|-----------|--------------------------------------|
| tem       | Temperatura que se quiere introducir |
| min       | Temperatura minima                   |
| max       | Temperatura maxima                   |
| icon      | Icono de la temperatura              |

## STOCK


### GET /stock

Devuelve los datos de bolsa para una determinada empresa. Además añade
los datos de fake si existen

#### Params

| Parametro | Descripcion                          |
|-----------|--------------------------------------|
| q         | query para YQL de yahoo              |

#### Response 200
```json
{
  "query": {
    "count": 3,
    "created": "2017-01-25T12:17:57Z",
    "lang": "en-US",
    "results": {
      "quote": [
        {
          "symbol": "yhoo",
          "AverageDailyVolume": "9440760",
          "Change": "+1.50",
          "DaysLow": "43.43",
          "DaysHigh": "44.22",
          "YearLow": "26.15",
          "YearHigh": "44.92",
          "MarketCapitalization": "41.89B",
          "LastTradePriceOnly": "43.90",
          "DaysRange": "43.43 - 44.22",
          "Name": "Yahoo! Inc.",
          "Symbol": "yhoo",
          "Volume": "24933809",
          "StockExchange": "NMS"
        }
      ]
    }
  }
}
```
#### Response 400

```json
{
  "error": {
    "lang": "en-US",
    "description": "Query syntax error(s) [line 1:0 expecting statement_ql got 'undefined']"
  }
}
```
### POST /stock

Introduce datos en la cache de stock.

#### Params

| Parametro          | Descripcion                                                            |
|--------------------|------------------------------------------------------------------------|
| Symbol             | Simbolo de la empresa                                                  |
| Change             | Cambio a lo largo de la empresa (+x si es positivo, -x si es negativo) |
| DaysLow            | Valor minimo en el dia                                                 |
| DaysHigh           | Valor maximo en el dia                                                 |
| YearLow            | Valor minimo en el año                                                 |
| YearHigh           | Valor maximo en el año                                                 |
| Volume             | Valor del volumen de la empresa                                        |
| LastTradePriceOnly | ???                                                                    |


## TRAFFIC

### GET /traffic

Devuelve los datos de trafico para un determinado lugar. Además introduce datos
de la cache si existen.

#### Params

| Parametro          | Descripcion                                                            |
|--------------------|------------------------------------------------------------------------|
| map                | coordenadas del lugar (sur,oeste, norte, este)                         |
| key                | api key en google geoencode                                            |

#### Response 200
```json
{
  "authenticationResultCode": "ValidCredentials",
  "brandLogoUri": "http://dev.virtualearth.net/Branding/logo_powered_by.png",
  "copyright": "Copyright © 2017 Microsoft and its suppliers. All rights reserved. This API cannot be accessed and the content and any results may not be used, reproduced or transmitted in any manner without express written permission from Microsoft Corporation.",
  "resourceSets": [
    {
      "estimatedTotal": 830,
      "resources": [
        {
          "__type": "TrafficIncident:http://schemas.microsoft.com/search/local/ws/rest/v1",
          "point": {
            "type": "Point",
            "coordinates": [
              51.387163,
              -0.070061
            ]
          },
          "description": "At Croydon - Incident. Burst water main.",
          "end": "/Date(1485360000000)/",
          "incidentId": 1427334330717565700,
          "lastModified": "/Date(1485346704155)/",
          "roadClosed": false,
          "severity": 3,
          "source": 9,
          "start": "/Date(1484808660000)/",
          "toPoint": {
            "type": "Point",
            "coordinates": [
              51.387083,
              -0.070284
            ]
          },
          "type": 8,
          "verified": true
        },
        ...
      ]
    }
  ]
}
```
#### Response 400
```
Key and map param are required
```
### POST /traffic
Introduce datos en la cache de trafico

#### Params
| Parametro          | Descripcion                         |
|--------------------|-------------------------------------|
| description        | Descripcion de la incidencia        |
| severity(opcional) | Nivel de severidad de la incidencia |
