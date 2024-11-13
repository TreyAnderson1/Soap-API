const express = require("express");
const app = express();
const util = require("util");
const _ = require("lodash");
const fetch = require("node-fetch");
const counties = require("./Counties/us-county-boundaries");
require("dotenv").config();
const cors = require("cors");
app.use(express.json());
app.use(cors());
var XMLHttpRequest = require("xhr2");
const xml2js = require("xml2js");
const devURL = process.env.REACT_APP_DEV_URL;
const prodURL = process.env.REACT_APP_PROD_URL;
const url = prodURL;
const testIntegratorKey = process.env.REACT_APP_TEST_INTEGRATOR_KEY;
const prodIntegratorKey = process.env.REACT_APP_PROD_INTEGRATOR_KEY;
const integratorKey = prodIntegratorKey;
const devAPIKey = process.env.REACT_APP_DEV_API_KEY;
const prodAPIKey = process.env.REACT_APP_PROD_API_KEY;
const apiKey = prodAPIKey;
const userName = process.env.REACT_APP_USER_NAME;
const password = process.env.REACT_APP_PASSWORD;
const ninjaAPIKey = process.env.REACT_APP_GEOCODING_API_KEY;

function getAccessToken() {
  var xhr = new XMLHttpRequest();
  return new Promise((resolve, reject) => {
    xhr.onreadystatechange = () => {
      // Call a function when the state changes.
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        // Request finished. Do processing here.
        xml2js.parseString(xhr.responseText, (err, result) => {
          if (err) {
            throw err;
          }

          // `result` is a JavaScript object
          // convert it to a JSON string
          const json = JSON.stringify(result, null, 4);

          // log JSON string
          const test = JSON.parse(json);

          var responseId =
            test["s:Envelope"]["s:Body"]["0"]["GetAccessKeyResponse"]["0"][
              "GetAccessKeyResult"
            ]["0"]; //get to the final result
            console.log('data', test["s:Envelope"]["s:Body"]["0"]["GetAccessKeyResponse"]["0"])
            console.log('responseId', responseId) 
          resolve(responseId);
        });
      } else {
        console.log('failed',xhr.status)
      }
    };

    xhr.open("POST", `${url}/titlepro?apikey=${apiKey}`, true);

    var sr = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <GetAccessKey xmlns="http://api.sitexdata.com/TitleApi/">
              <UserName>${userName}</UserName>
              <Password>${password}</Password>
              <SiteID>6</SiteID>
              <IntegratorKey>${integratorKey}</IntegratorKey>
            </GetAccessKey>
          </soap:Body>
        </soap:Envelope>`;

    xhr.setRequestHeader("Content-Type", "text/xml");
    xhr.setRequestHeader(
      "soapAction",
      "http://api.sitexdata.com/TitleApi/GetAccessKey"
    );
    xhr.send(sr);
  });
}

function getPropertyAddress(address, location, key) {
  var xhr = new XMLHttpRequest();
  var loc = location.split(" ");
  var city = "";
  if (
    loc[loc.length - 1].toLocaleLowerCase() === "ca" ||
    loc[loc.length - 1].toLocaleLowerCase() === "az"
  ) {
    for (let i = 0; i < loc.length - 1; i++) {
      city = city + loc[i] + " ";
    }
  } //gets the spaces between cities
  else {
    city = location;
  }
  city = city
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim()
    .toLowerCase();
    city = city + ', ca'

  return new Promise((resolve, reject) => {
    // 3400 E Sky Harbor Blvd
    // Phoenix, AZ 85034-4403
    xhr.onreadystatechange = () => {
      // Call a function when the state changes.
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        // Request finished. Do processing here.
        xml2js.parseString(xhr.responseText, (err, result) => {
          if (err) {
            throw err;
          }

          const json = JSON.stringify(result, null, 4);

          const data = JSON.parse(json);
          resolve(data);
          // if (
          //   data["s:Envelope"]["s:Body"]["0"]["AddressSearchResponse"]["0"][
          //     "AddressSearchResult"
          //   ][0].Status[0] == "OK"
          // ) {
          //   //if the report exists inside of the data
          //   resolve({
          //     result: `data:application/pdf;base64,${data["s:Envelope"]["s:Body"]["0"]["AddressSearchResponse"]["0"]["AddressSearchResult"]["0"]["Report"]["0"]}`,
          //   });
          // } else {
          //   //if the report does not exist return saying to re-enter the information
          //   resolve({ errorMessage: "The address could not be found or returned nothing",error:true });
          // }
        });
      }
    };

    xhr.open("POST", `${url}/titlepro?apikey=${apiKey}`, true);
    var addressString = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <AddressSearch xmlns="http://api.sitexdata.com/TitleApi/">
              <AccessKey>${key}</AccessKey>
              <Address>${address}</Address>
              <LastLine>${city}</LastLine>
              <ReportType>144.1</ReportType>
              <ClientReference></ClientReference>
              <Options>report_format=PDF</Options>
            </AddressSearch>
          </soap:Body>
        </soap:Envelope>`;

    xhr.setRequestHeader("Content-Type", "text/xml");
    xhr.setRequestHeader(
      "SOAPAction",
      `http://api.sitexdata.com/TitleApi/AddressSearch`
    );

    xhr.send(addressString);
  });
}

async function getAPN(apn, location, key) {
  var xhr = new XMLHttpRequest();
  var loc = location.split(" ");
  var city = "";
  if (
    loc[loc.length - 1].toLocaleLowerCase() === "ca" ||
    loc[loc.length - 1].toLocaleLowerCase() === "az"
  ) {
    for (let i = 0; i < loc.length - 1; i++) {
      city = city + loc[i] + " ";
    }
  } //gets the spaces between cities
  else {
    city = location;
  }
  city = city
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim()
    .toLowerCase();
  const found = counties.find(
    (county) =>
      county.NAMELSAD.toLowerCase() === city ||
      county.NAME.toLowerCase() === city
  );
  let fips = "";
  if (!found) {
    //if it is not found look for city and use that fips
    const lat = await getLatAndLong(city, "CA");
    if (lat.latitude) {
      fips = await getFIPS(lat.latitude, lat.longitude); //if it is 0 means it did not get the lat and long
    } else {
      return {
        errorMessage: "Latitude and Longitude was undefined",
        error: true,
      };
    }
  } else {
    // @ts-ignore: Object is possibly 'null'.
    fips = found.GEOID;
  }
  if (fips == null) {
    return { errorMessage: "FIPS was not found", error: true }; //if fips is undefined will error
  }
  return new Promise((resolve, reject) => {
    xhr.onreadystatechange = () => {
      // Call a function when the state changes.
      if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
        // Request finished. Do processing here.
        xml2js.parseString(xhr.responseText, (err, result) => {
          if (err) {
            throw err;
          }

          // `result` is a JavaScript object
          // convert it to a JSON string
          const json = JSON.stringify(result, null, 4);
          const data = JSON.parse(json);
          // @todo breaks on apartment complexes, i.e. 1111 W. University Dr.
          resolve(data);
          // if (
          //   data["s:Envelope"]["s:Body"]["0"]["ApnSearchResponse"]["0"][
          //     "ApnSearchResult"
          //   ][0].Status[0] == "OK"
          // ) {
          //   //if the report exists inside of the data
          //   resolve({
          //     result: `data:application/pdf;base64,${data["s:Envelope"]["s:Body"]["0"]["ApnSearchResponse"]["0"]["ApnSearchResult"]["0"]["Report"]["0"]}`,
          //   });
          // } else {
          //   //if the report does not exist return saying to re-enter the information
          //   resolve({ errorMessage: "APN did not work please make sure it is the correct APN", error: true });
          // }
        });
      }
    };

    xhr.open("POST", `${url}/titlepro?apikey=${apiKey}`, true);

    var addressString = `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <ApnSearch xmlns="http://api.sitexdata.com/TitleApi/">
              <AccessKey>${key}</AccessKey>
              <FIPS>${fips}</FIPS>
              <APN>${apn}</APN>
              <ReportType>144.1</ReportType>
              <ClientReference></ClientReference>
              <Options>report_format=PDF</Options>
            </ApnSearch>
          </soap:Body>
        </soap:Envelope>`;

    xhr.setRequestHeader("Content-Type", "text/xml");
    xhr.setRequestHeader(
      "SOAPAction",
      "http://api.sitexdata.com/TitleApi/ApnSearch"
    );

    xhr.send(addressString);
  });
}

async function getLatAndLong(city, state) {
  const cityAndState = `https://api.api-ninjas.com/v1/geocoding?city=${city}&state=${state}&country=USA`;
  const api_key = ninjaAPIKey;
  const options = {
    method: "GET",
    headers: {
      "X-Api-Key": api_key,
    },
  };
  const response = await fetch(`${cityAndState}`, options);
  const result = await response.json();
  console.log("LatitudeAndLongitude", result);

  if (!result.length) {
    return { latitude: undefined, longitude: undefined }; //return 0 if nothing is found
  } else {
    return {
      latitude: result[0]["latitude"],
      longitude: result[0]["longitude"],
    }; //return the lat and long if they are found
  }
}

async function getFIPS(latitude, longitude) {
  const latAndlongFIPSURL = `https://geo.fcc.gov/api/census/block/find?latitude=${latitude}&longitude=${longitude}&format=json`;
  const options = {
    method: "GET",
  };
  const response = await fetch(`${latAndlongFIPSURL}`, options);
  const result = await response.json();
  return result["County"]["FIPS"];
}

app.get("/api/AddressSearch", async (req, res) => {
  const address = req.query.address;
  const city = req.query.city;
  console.log('city', city)
  const token = await getAccessToken();
  const result = await getPropertyAddress(address, city, token);
  res.send(JSON.stringify(result));
});

app.get("/api/APN", async (req, res) => {
  const apn = req.query.address;
  const city = req.query.city;
  const token = await getAccessToken();
  const result = await getAPN(apn, city, token);
  res.send(JSON.stringify(result));
});

app.get("/", function (req, res) {
  res.send("Hello");
});

//PORT ENVIRONMENT VARIABLE
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}..`));


