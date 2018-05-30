$.ajaxSetup({
  async: false,
  data: {
    "$limit": 3000
  }
});

var clickedDistrict = 0;

//water #56a0ad
//http://paletton.com/#uid=72u0T0kcglL4Zvw8Eq6eXhmkwen

var initialLocation;
var nNames = 'https://data.cityofnewyork.us/api/views/xyye-rtrs/rows.json?accessType=DOWNLOAD';
var crimeRates = 'https://data.cityofnewyork.us/resource/9s4h-37hy.json?$where=cmplnt_fr_dt=%222015-12-31T00:00:00%22';
var nBorders = 'https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nycd/FeatureServer/0/query?where=1=1&outFields=*&outSR=4326&f=geojson';
var nHousing = 'https://data.cityofnewyork.us/api/views/hg8x-zxpr/rows.json?accessType=DOWNLOAD';
var nMuseums = 'https://data.cityofnewyork.us/api/views/fn6f-htvy/rows.json?accessType=DOWNLOAD';
var nGalleries = 'https://data.cityofnewyork.us/api/views/43hw-uvdj/rows.json?accessType=DOWNLOAD';

var galleries;
var museums;
var districtBorders;
var districtNames;
var districtCrimes;
var districtHousing;
var map;

var districtsFinal = [];

var DISTRICT_INFORMATION = {
  101 : ["Manhattan"],
  102 : ["Manhattan"],
  103 : ["Manhattan"],
  104 : ["Manhattan"],
  105 : ["Manhattan"],
  106 : ["Manhattan"],
  107 : ["Manhattan"],
  108 : ["Manhattan"],
  109 : ["Manhattan"],
  110 : ["Manhattan"],
  111 : ["Manhattan"],
  112 : ["Manhattan"],
  201 : ["Bronx"],
  202 : ["Bronx"],
  203 : ["Bronx"],
  204 : ["Bronx"],
  205 : ["Bronx"],
  206 : ["Bronx"],
  207 : ["Bronx"],
  208 : ["Bronx"],
  209 : ["Bronx"],
  210 : ["Bronx"],
  211 : ["Bronx"],
  212 : ["Bronx"],
  301 : ["Brooklyn"],
  302 : ["Brooklyn"],
  303 : ["Brooklyn"],
  304 : ["Brooklyn"],
  305 : ["Brooklyn"],
  306 : ["Brooklyn"],
  307 : ["Brooklyn"],
  308 : ["Brooklyn"],
  309 : ["Brooklyn"],
  310 : ["Brooklyn"],
  311 : ["Brooklyn"],
  312 : ["Brooklyn"],
  313 : ["Brooklyn"],
  314 : ["Brooklyn"],
  315 : ["Brooklyn"],
  316 : ["Brooklyn"],
  317 : ["Brooklyn"],
  318 : ["Brooklyn"],
  401 : ["Queens"],
  402 : ["Queens"],
  403 : ["Queens"],
  404 : ["Queens"],
  405 : ["Queens"],
  406 : ["Queens"],
  407 : ["Queens"],
  408 : ["Queens"],
  409 : ["Queens"],
  410 : ["Queens"],
  411 : ["Queens"],
  412 : ["Queens"],
  413 : ["Queens"],
  414 : ["Queens"],
  501 : ["Staten Island"],
  502 : ["Staten Island"],
  503 : ["Staten Island"],
};

var dis = Object.keys(DISTRICT_INFORMATION);

function getNamesData(URL)
{
  districtNames = $.getJSON(URL, function() {
  })

  console.log(districtNames);
}

function getCrimes(URL)
{
  districtCrimes = $.getJSON(URL, function() {
  })
  console.log(districtCrimes);
}

function getHousing(URL)
{
  districtHousing = $.getJSON(URL, function() {
  })
  console.log(districtHousing);

  var houses = [];
  for(var data of districtHousing.responseJSON.data)
  {

    var borough = data[19].slice(0,2);
    var id = Number(data[19].slice(data[19].length-2,data[19].length));

    if(borough == "MN") id += 100;
    if(borough == "BX") id += 200;
    if(borough == "BK") id += 300;
    if(borough == "QN") id += 400;
    if(borough == "SI") id += 500;

    if(!containsById(id,houses))
    {
      houses.push({
        id: id,
        sum: 0
      });
    }
    houses.find(x=>x.id===id).sum += Number(data[33]);
  }

  var housesArray = [];
  for(var i=0; i<houses.length; i++)
  {
      housesArray.push(houses[i].sum);
  }

  var media = getMedia(housesArray);
  var sDeviation = getStandardDeviation(media, housesArray);

  for(var house of houses)
  {
    districtsFinal.find(x => x.id == house.id).housingPoints = normalize(house.sum, media, sDeviation);
  }

}

function getBorders(URL)
{
  districtBorders = $.getJSON(URL, function() {
  })
  console.log(districtBorders);
  for(var feature of districtBorders.responseJSON.features)
  {
    if(feature.properties.BoroCD%100 < 20)
    {
      var bor;
      if(Number(feature.properties.BoroCD/100).toPrecision(1) == 1) bor = "Manhattan";
      if(Number(feature.properties.BoroCD/100).toPrecision(1) == 2) bor = "Bronx";
      if(Number(feature.properties.BoroCD/100).toPrecision(1) == 3) bor = "Brooklyn";
      if(Number(feature.properties.BoroCD/100).toPrecision(1) == 4) bor = "Queens";
      if(Number(feature.properties.BoroCD/100).toPrecision(1) == 5) bor = "Staten Island";

      districtsFinal.push(
        {
          id: feature.properties.BoroCD,
          borough: bor
        }
      )
    }
  }
  districtsFinal.sort(function(a,b){return a.id-b.id});
}

function getMuseums(URL)
{
  museums = $.getJSON(URL, function() {
  })
  console.log(museums);
}

function getGalleries(URL)
{
  galleries = $.getJSON(URL, function() {
  })
  console.log(galleries);
}

$(document).ready(getBorders(nBorders));
$(document).ready(getNamesData(nNames));
$(document).ready(getHousing(nHousing));
$(document).ready(getCrimes(crimeRates));
$(document).ready(getMuseums(nMuseums));
$(document).ready(getGalleries(nGalleries));

function createPolygons()
{
  for(var feature of districtBorders.responseJSON.features)
  {
	   var path = [];
     var bounds = new google.maps.LatLngBounds();
     if(feature.geometry.coordinates.length == 1)
     {
       for(var i=0; i<feature.geometry.coordinates["0"].length; i++)
       {

          var point = feature.geometry.coordinates["0"][i];
          path.push(new google.maps.LatLng(point[1],point[0]));
          bounds.extend(new google.maps.LatLng(point[1],point[0]));
        }
        var polygon = new google.maps.Polygon({
          paths:path
        });

        if(dis.includes(String(feature.properties.BoroCD) ))
        {
    		    DISTRICT_INFORMATION[feature.properties.BoroCD].push({
              type: "pol",
              poly: polygon
            });
            DISTRICT_INFORMATION[feature.properties.BoroCD].push(bounds);
        }
      }
      else
      {
        var mult = [];
        for(var i=0; i<feature.geometry.coordinates.length; i++)
        {

	        path = [];
          for(var j=0; j<feature.geometry.coordinates[i]["0"].length; j++)
          {
            var point = feature.geometry.coordinates[i]["0"][j];
            path.push(new google.maps.LatLng(point[1],point[0]));
            bounds.extend(new google.maps.LatLng(point[1],point[0]));
          }
          var polygon = new google.maps.Polygon({
            paths:path
          });

          mult.push(polygon);
        }

        if(dis.includes(String(feature.properties.BoroCD) ))
        {
    		    DISTRICT_INFORMATION[feature.properties.BoroCD].push({
              type: 'mult',
              poly: mult
            });
            DISTRICT_INFORMATION[feature.properties.BoroCD].push(bounds);
        }
      }
  }
}

function initMap()
{
  var mapBounds = new google.maps.LatLngBounds();
  initialLocation = new google.maps.LatLng(40.7291, -73.9965);
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 11,
    center: initialLocation,
    disableDefaultUI: true,
    styles: [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "landscape.man_made",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#d2d2d2"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#c1c1c1"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#7f7f7f"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#7d7d7d"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#43636B"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
]
  });
  var marker = new google.maps.Marker({
    position: initialLocation,
    map: map
    //icon: 'http://maps.google.com/mapfiles/ms/micons/bar.png'

  });

  map.data.loadGeoJson(nBorders);

  map.data.addListener('addfeature', function(event)
  {
    event.feature.getGeometry().forEachLatLng(function(latLng)
    {
      var n = new google.maps.LatLng();
      n.lat = latLng.lat;
      n.lng = latLng.lng;
      mapBounds.extend(n);
    });
    map.fitBounds(mapBounds,-5);
  });


  var controlButton = document.createElement('button');
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(controlButton);
  controlButton.id = "googleButton";
  controlButton.innerHTML = "Center Map";

  map.data.setStyle(function(feature){

    var color = 'darkgreen';

    if(feature.getProperty('BoroCD')>=100 && feature.getProperty('BoroCD')<=120)
    {
      color = 'yellow';
    }
    if(feature.getProperty('BoroCD')>=200 && feature.getProperty('BoroCD')<=220)
    {
      color = 'red';
    }
    if(feature.getProperty('BoroCD')>=300 && feature.getProperty('BoroCD')<=320)
    {
      color = 'deeppink';
    }
    if(feature.getProperty('BoroCD')>=400 && feature.getProperty('BoroCD')<=420)
    {
      color = 'blue';
    }
    if(feature.getProperty('BoroCD')>=501 && feature.getProperty('BoroCD')<=520)
    {
      color = 'cyan';
    }
    return ({
      fillColor: color,
      strokeWeight: 2,
      fillOpacity: 0.4
    });
  });

  map.data.addListener('mouseover', function(event){
    if(dis.includes(String(event.feature.getProperty('BoroCD'))) && event.feature.getProperty('BoroCD')!=clickedDistrict 	)
    {
      map.data.overrideStyle(event.feature, {strokeWeight: 5});
    }
  });

  map.data.addListener('mouseout', function(event){
    if(event.feature.getProperty('BoroCD')!=clickedDistrict)
    {
      map.data.overrideStyle(event.feature, {strokeWeight: 2});
    }
  });

  map.data.addListener('click', function(event){
    var id = event.feature.getProperty('BoroCD');
    clickedDistrict = id;
    if(dis.includes(String(id)))
    {
      map.data.revertStyle();
      map.data.overrideStyle(event.feature, {
        strokeWeight: 8,
        fillOpacity : 0.7
      });

      gauge1.update(districtsFinal.find(x => x.id === id).distancePoints);
      gauge2.update(districtsFinal.find(x => x.id === id).housingPoints);
      gauge3.update(districtsFinal.find(x => x.id === id).safetyPoints);

      document.getElementById('distance').innerHTML = 'Borough:   ' + DISTRICT_INFORMATION[id][0] + '<br>' + 'District:   ' + id;
      map.panTo(DISTRICT_INFORMATION[id][3]);
      map.fitBounds(DISTRICT_INFORMATION[id][2]);
    }
  });

  controlButton.addEventListener('click', function(){
    clickedDistrict=0;
    gauge1.update(0);
    gauge2.update(0);
    gauge3.update(0);
    document.getElementById('distance').innerHTML = 'Borough: ' + '<br>' + 'District: ';
    map.data.revertStyle();
    map.fitBounds(mapBounds,-5);
  });
}

$("#distance-table").click(function()
  {
    districtsFinal.sort(function(a,b){return(b.distancePoints-a.distancePoints)});

    document.getElementById("top10-table").innerHTML = "";
    var table = document.createElement('table');

    var header = table.createTHead();
    var rowh = header.insertRow(0);
    var cell1 = rowh.insertCell(0);
    cell1.innerHTML = '<b>Borough</b>';
    var cell2 = rowh.insertCell(1);
    cell2.innerHTML = '<b>District Id</b>';
    var cell3 = rowh.insertCell(2);
    cell3.innerHTML = '<b>Distance Points</b>';

    for(var i = 1; i < 11; i++)
    {
      var id = districtsFinal[i-1].id;
      var distance = String(districtsFinal[i-1].distancePoints).slice(0,5);
      var borough = districtsFinal[i-1].borough;
      var row = table.insertRow(i);

      var borougCell = row.insertCell(0);
      borougCell.innerHTML = borough;

      var idCell = row.insertCell(1);
      idCell.innerHTML = id;

      var distanceCell = row.insertCell(2);
      distanceCell.innerHTML = distance;
    }
    document.getElementById("top10-table").appendChild(table);
  });

$("#safety-table").click(function()
  {
    districtsFinal.sort(function(a,b){return(b.safetyPoints-a.safetyPoints)});

    document.getElementById("top10-table").innerHTML = "";
    var table = document.createElement('table');
    //var table = document.getElementById('top10-table');

    var header = table.createTHead();
    var rowh = header.insertRow(0);
    var cell1 = rowh.insertCell(0);
    cell1.innerHTML = '<b>Borough</b>';
    var cell2 = rowh.insertCell(1);
    cell2.innerHTML = '<b>District Id</b>';
    var cell3 = rowh.insertCell(2);
    cell3.innerHTML = '<b>Safety Points</b>';

    for(var i = 1; i < 11; i++)
    {
      var id = districtsFinal[i-1].id;
      var safety = String(districtsFinal[i-1].safetyPoints).slice(0,5);
      var borough = districtsFinal[i-1].borough;
      var row = table.insertRow(i);

      var borougCell = row.insertCell(0);
      borougCell.innerHTML = borough;

      var idCell = row.insertCell(1);
      idCell.innerHTML = id;

      var safetyCell = row.insertCell(2);
      safetyCell.innerHTML = safety;
    }
    document.getElementById("top10-table").append(table);
  });

$("#affordability-table").click(function()
  {
    districtsFinal.sort(function(a,b){return(b.housingPoints-a.housingPoints)});

    document.getElementById("top10-table").innerHTML = "";
    var table = document.createElement('table');
    //var table = document.getElementById('top10-table');

    var header = table.createTHead();
    var rowh = header.insertRow(0);
    var cell1 = rowh.insertCell(0);
    cell1.innerHTML = '<b>Borough</b>';
    var cell2 = rowh.insertCell(1);
    cell2.innerHTML = '<b>District Id</b>';
    var cell3 = rowh.insertCell(2);
    cell3.innerHTML = '<b>Affordability Points</b>';

    for(var i = 1; i < 11; i++)
    {
      var id = districtsFinal[i-1].id;
      var housing = String(districtsFinal[i-1].housingPoints).slice(0,5);
      var borough = districtsFinal[i-1].borough;
      var row = table.insertRow(i);

      var borougCell = row.insertCell(0);
      borougCell.innerHTML = borough;

      var idCell = row.insertCell(1);
      idCell.innerHTML = id;

      var housingCell = row.insertCell(2);
      housingCell.innerHTML = housing;
    }
    document.getElementById("top10-table").append(table);
  });

$("#top3-tab").click(function()
  {
    document.getElementById("top3-table").innerHTML = "";
    for(district of districtsFinal)
    {
      district.totalPoints = (district.distancePoints + district.housingPoints + district.safetyPoints)/3;
    }
    districtsFinal.sort(function(a,b){return(b.totalPoints - a.totalPoints)});

    var table = document.createElement('table');

    var header = table.createTHead();
    var rowh = header.insertRow(0);
    var cell1 = rowh.insertCell(0);
    cell1.innerHTML = '<b>Borough</b>';
    var cell2 = rowh.insertCell(1);
    cell2.innerHTML = '<b>District Id</b>';
    var cell3 = rowh.insertCell(2);
    cell3.innerHTML = '<b>Total Points</b>';

    for(var i = 1; i < 4; i++)
    {
      var id = districtsFinal[i-1].id
      var total = districtsFinal[i-1].totalPoints.toPrecision(4);
      var borough = districtsFinal[i-1].borough;
      var row = table.insertRow(i);

      var borougCell = row.insertCell(0);
      borougCell.innerHTML = borough;

      var idCell = row.insertCell(1);
      idCell.innerHTML = id;

      var totalCell = row.insertCell(2);
      totalCell.innerHTML = total;
    }
    document.getElementById("top3-table").append(table);
  });


function exportTableToCSV($table, filename) {
  var $headers = $table.find('tr:has(th)')
      ,$rows = $table.find('tr:has(td)')

      // Temporary delimiter characters unlikely to be typed by keyboard
      // This is to avoid accidentally splitting the actual contents
      ,tmpColDelim = String.fromCharCode(11) // vertical tab character
      ,tmpRowDelim = String.fromCharCode(0) // null character

      // actual delimiter characters for CSV format
      ,colDelim = '","'
      ,rowDelim = '"\r\n"';

      // Grab text from table into CSV formatted string
      var csv = '"';
      csv += formatRows($headers.map(grabRow));
      csv += rowDelim;
      csv += formatRows($rows.map(grabRow)) + '"';

      // Data URI
      var csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

  // For IE (tested 10+)
  if (window.navigator.msSaveOrOpenBlob) {
      var blob = new Blob([decodeURIComponent(encodeURI(csv))], {
          type: "text/csv;charset=utf-8;"
      });
      navigator.msSaveBlob(blob, filename);
  } else {
      $(this)
          .attr({
              'download': filename
              ,'href': csvData
              //,'target' : '_blank' //if you want it to open in a new window
      });
  }

  //------------------------------------------------------------
  // Helper Functions
  //------------------------------------------------------------
  function formatRows(rows){
      return rows.get().join(tmpRowDelim)
          .split(tmpRowDelim).join(rowDelim)
          .split(tmpColDelim).join(colDelim);
  }
  function grabRow(i,row){

      var $row = $(row);
      var $cols = $row.find('td');
      if(!$cols.length) $cols = $row.find('th');

      return $cols.map(grabCol)
                  .get().join(tmpColDelim);
  }
  function grabCol(j,col){
      var $col = $(col),
          $text = $col.text();

      return $text.replace('"', '""'); // escape double quotes

  }
}


$("#export").click(function (event) {
    //var outputFile = window.prompt("What do you want to name your output file (Note: This won't have any effect on Safari)") || 'export';
    //outputFile = outputFile.replace('.csv','') + '.csv'

    exportTableToCSV.apply(this, [$('#top10-table'), 'table.csv']);
});

$("#export3").click(function (event) {
    //var outputFile = window.prompt("What do you want to name your output file (Note: This won't have any effect on Safari)") || 'export';
    //outputFile = outputFile.replace('.csv','') + '.csv'

    exportTableToCSV.apply(this, [$('#top3-table'), 'table.csv']);
});

function museumsMarkers()
{
    /*for(var i of museums.responseJSON.data)
    {
      var point = i[8].toString().slice(7,length-1).split(' ');
      var latLng = new google.maps.LatLng(Number(point[1]), Number(point[0]));

      var marker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: 'http://maps.google.com/mapfiles/ms/micons/flag.png'
      });
    }*/
}

function galleriesMarkers()
{
    /*for(var i of galleries.responseJSON.data)
    {
      var point = i[9].toString().slice(7,length-1).split(' ');
      var latLng = new google.maps.LatLng(Number(point[1]), Number(point[0]));

      var marker = new google.maps.Marker({
        position: latLng,
        map: map,
        icon: 'http://maps.google.com/mapfiles/ms/micons/arts.png'
      });
    }*/
}

function center()
{
  for(var districtId of dis)
  {
    var bounds = new google.maps.LatLngBounds();

    for(var i in districtNames.responseJSON.data)
    {
      if(districtNames.responseJSON.data[i][17]==false || districtNames.responseJSON.data[i][16]==DISTRICT_INFORMATION[districtId]["0"])
      {
        var point = districtNames.responseJSON.data[i][9].toString().slice(7,length-1).split(' ');
        var latLng = new google.maps.LatLng(Number(point[1]), Number(point[0]));

        if(DISTRICT_INFORMATION[districtId]["1"].type == 'pol')
        {
          if(google.maps.geometry.poly.containsLocation(latLng,DISTRICT_INFORMATION[districtId]["1"].poly))
          {
            districtNames.responseJSON.data[i].push(true);
            bounds.extend(latLng);
            break;
          }
        }
        else
        {

          for(var j=0; j < DISTRICT_INFORMATION[districtId]["1"].poly.length; j++)
          {
            if(google.maps.geometry.poly.containsLocation(latLng, DISTRICT_INFORMATION[districtId]["1"].poly[j]))
            {

              districtNames.responseJSON.data[i].push(true);
              bounds.extend(latLng);
              b = true;
              break;
            }
          }
        }
      }
    }
    DISTRICT_INFORMATION[districtId].push(bounds.getCenter());
  }
}

function getDistance()
{
  var distanceArray = [];
  for(var districtId of dis)
  {
    var distance;
    distance = google.maps.geometry.spherical.computeDistanceBetween(initialLocation, DISTRICT_INFORMATION[districtId][3]);
    DISTRICT_INFORMATION[districtId].push(distance);
    distanceArray.push(distance);
  }
  var media = getMedia(distanceArray);
  var sDeviation = getStandardDeviation(media, distanceArray);
  for(var district of districtsFinal)
  {
    district.distancePoints = normalize(-DISTRICT_INFORMATION[district.id][4], media, sDeviation);
  }
}

function getCrimesData()
{
  var crimes = [];
  for(var data of districtCrimes.responseJSON)
  {
    var borough = data.boro_nm;
    if(typeof data.latitude != 'undefined')
    {
      var latLng = new google.maps.LatLng({lat: Number(data.latitude), lng: Number(data.longitude)});
      for(var district of dis)
      {
        if(DISTRICT_INFORMATION[district]["0"].toUpperCase()==borough)
        {
          if(DISTRICT_INFORMATION[district]["1"].type == 'pol')
          {
            if(google.maps.geometry.poly.containsLocation(latLng, DISTRICT_INFORMATION[district]["1"].poly))
            {
              if(!containsById(district,crimes))
              {
                crimes.push({
                  id: district,
                  sum: 0
                });
              }
              crimes.find(x=>x.id===district).sum++;
              break;
            }
          }
          else
          {
            var b = false;
            for(var i=0; i<DISTRICT_INFORMATION[district]["1"].poly.length; i++)
            {
              if(google.maps.geometry.poly.containsLocation(latLng, DISTRICT_INFORMATION[district]["1"].poly[i]))
              {
                if(!containsById(district,crimes))
                {
                  crimes.push({
                    id: district,
                    sum: 0
                  });
                }
                crimes.find(x=>x.id===district).sum++;
                b=true;
                break;
              }
            }
            if(b) break;
          }
        }
      }
    }
  }
  console.log(crimes);

  var crimesArray = [];
  for(var i=0; i<crimes.length; i++)
  {
      crimesArray.push(crimes[i].sum);
  }

  var media = getMedia(crimesArray);
  var sDeviation = getStandardDeviation(media, crimesArray);
  for(var crime of crimes)
  {
    districtsFinal.find(x => x.id == crime.id).safetyPoints = normalize(-crime.sum, media, sDeviation);
  }
  crimes.sort(function(a,b)
  {
    return(a.id-b.id);
  });
}

function containsById(id, array)
{
  for(var i=0; i<array.length; i++)
  {
    if(array[i].id == id) return true;
  }
  return false;
}

function getMedia(values)
{
  var sum = 0;
  for(var i=0; i<values.length; i++)
  {
    sum += values[i];
  }
  return sum/values.length
}

function getStandardDeviation(media, values)
{
  var sum = 0;
  for(var i=0; i<values.length; i++)
  {
    sum += Math.pow(values[i] - media,2);
  }
  return (Math.sqrt(sum/58));
}

function normalize(value, media, sDeviation)
{
  var normalized = (Math.abs(value) - media)/sDeviation;
  if(value<0) return  (-1*normalized*16 + 50);
  return (normalized*16 + 50);
}

var config = liquidFillGaugeDefaultSettings();
config.circleColor = "#763F56";
config.textColor = "#763F56";
config.waveTextColor = "#B18196";
config.waveColor = "#2E4F55";
config.circleThickness = 0.1;
config.circleFillGap = 0.2;
config.textVertPosition = 0.8;
config.waveAnimateTime = 2000;
config.waveHeight = 0.3;
config.waveCount = 1;
var gauge1 = loadLiquidFillGauge("fillgauge1", 0, config);

var gauge2= loadLiquidFillGauge("fillgauge2", 0, config);

var gauge3 = loadLiquidFillGauge("fillgauge3", 0, config);

function liquidFillGaugeDefaultSettings(){
    return {
        minValue: 0, // The gauge minimum value.
        maxValue: 100, // The gauge maximum value.
        circleThickness: 0.05, // The outer circle thickness as a percentage of it's radius.
        circleFillGap: 0.05, // The size of the gap between the outer circle and wave circle as a percentage of the outer circles radius.
        circleColor: "#178BCA", // The color of the outer circle.
        waveHeight: 0.00000000001, // The wave height as a percentage of the radius of the wave circle.
        waveCount: 1, // The number of full waves per width of the wave circle.
        waveRiseTime: 1000, // The amount of time in milliseconds for the wave to rise from 0 to it's final height.
        waveAnimateTime: 18000, // The amount of time in milliseconds for a full wave to enter the wave circle.
        waveRise: true, // Control if the wave should rise from 0 to it's full height, or start at it's full height.
        waveHeightScaling: false, // Controls wave size scaling at low and high fill percentages. When true, wave height reaches it's maximum at 50% fill, and minimum at 0% and 100% fill. This helps to prevent the wave from making the wave circle from appear totally full or empty when near it's minimum or maximum fill.
        waveAnimate: true, // Controls if the wave scrolls or is static.
        waveColor: "#178BCA", // The color of the fill wave.
        waveOffset: 0, // The amount to initially offset the wave. 0 = no offset. 1 = offset of one full wave.
        textVertPosition: .5, // The height at which to display the percentage text withing the wave circle. 0 = bottom, 1 = top.
        textSize: 1, // The relative height of the text to display in the wave circle. 1 = 50%
        valueCountUp: true, // If true, the displayed value counts up from 0 to it's final value upon loading. If false, the final value is displayed.
        displayPercent: true, // If true, a % symbol is displayed after the value.
        textColor: "#045681", // The color of the value text when the wave does not overlap it.
        waveTextColor: "#A4DBf8" // The color of the value text when the wave overlaps it.
    };
}

function loadLiquidFillGauge(elementId, value, config) {
    if(config == null) config = liquidFillGaugeDefaultSettings();

    var gauge = d3.select("#" + elementId);
    var radius = Math.min(parseInt(gauge.style("width")), parseInt(gauge.style("height")))/2;
    var locationX = parseInt(gauge.style("width"))/2 - radius;
    var locationY = parseInt(gauge.style("height"))/2 - radius;
    var fillPercent = Math.max(config.minValue, Math.min(config.maxValue, value))/config.maxValue;

    var waveHeightScale;
    if(config.waveHeightScaling){
        waveHeightScale = d3.scale.linear()
            .range([0,config.waveHeight,0])
            .domain([0,50,100]);
    } else {
        waveHeightScale = d3.scale.linear()
            .range([config.waveHeight,config.waveHeight])
            .domain([0,100]);
    }

    var textPixels = (config.textSize*radius/2);
    var textFinalValue = parseFloat(value).toFixed(2);
    var textStartValue = config.valueCountUp?config.minValue:textFinalValue;
    var percentText = config.displayPercent?"%":"";
    var circleThickness = config.circleThickness * radius;
    var circleFillGap = config.circleFillGap * radius;
    var fillCircleMargin = circleThickness + circleFillGap;
    var fillCircleRadius = radius - fillCircleMargin;
    var waveHeight = 10;

    var waveLength = fillCircleRadius*2/config.waveCount;
    var waveClipCount = 1+config.waveCount;
    var waveClipWidth = waveLength*waveClipCount;

    // Rounding functions so that the correct number of decimal places is always displayed as the value counts up.
    var textRounder = function(value){ return Math.round(value); };
    if(parseFloat(textFinalValue) != parseFloat(textRounder(textFinalValue))){
        textRounder = function(value){ return parseFloat(value).toFixed(1); };
    }
    if(parseFloat(textFinalValue) != parseFloat(textRounder(textFinalValue))){
        textRounder = function(value){ return parseFloat(value).toFixed(2); };
    }

    // Data for building the clip wave area.
    var data = [];
    for(var i = 0; i <= 40*waveClipCount; i++){
        data.push({x: i/(40*waveClipCount), y: (i/(40))});
    }

    // Scales for drawing the outer circle.
    var gaugeCircleX = d3.scale.linear().range([0,2*Math.PI]).domain([0,1]);
    var gaugeCircleY = d3.scale.linear().range([0,radius]).domain([0,radius]);

    // Scales for controlling the size of the clipping path.
    var waveScaleX = d3.scale.linear().range([0,waveClipWidth]).domain([0,1]);
    var waveScaleY = d3.scale.linear().range([0,waveHeight]).domain([0,1]);

    // Scales for controlling the position of the clipping path.
    var waveRiseScale = d3.scale.linear()
        // The clipping area size is the height of the fill circle + the wave height, so we position the clip wave
        // such that the it will overlap the fill circle at all when at 0%, and will totally cover the fill
        // circle at 100%.
        .range([(fillCircleMargin+fillCircleRadius*2+waveHeight),(fillCircleMargin-waveHeight)])
        .domain([0,1]);
    var waveAnimateScale = d3.scale.linear()
        .range([0, waveClipWidth-fillCircleRadius*2]) // Push the clip area one full wave then snap back.
        .domain([0,1]);

    // Scale for controlling the position of the text within the gauge.
    var textRiseScaleY = d3.scale.linear()
        .range([fillCircleMargin+fillCircleRadius*2,(fillCircleMargin+textPixels*0.7)])
        .domain([0,1]);

    // Center the gauge within the parent SVG.
    var gaugeGroup = gauge.append("g")
        .attr('transform','translate('+locationX+','+locationY+')');

    // Draw the outer circle.
    var gaugeCircleArc = d3.svg.arc()
        .startAngle(gaugeCircleX(0))
        .endAngle(gaugeCircleX(1))
        .outerRadius(gaugeCircleY(radius))
        .innerRadius(gaugeCircleY(radius-circleThickness));
    gaugeGroup.append("path")
        .attr("d", gaugeCircleArc)
        .style("fill", config.circleColor)
        .attr('transform','translate('+radius+','+radius+')');

    // Text where the wave does not overlap.
    var text1 = gaugeGroup.append("text")
        .text(textRounder(textStartValue) + percentText)
        .attr("class", "liquidFillGaugeText")
        .attr("text-anchor", "middle")
        .attr("font-size", textPixels + "px")
        .style("fill", config.textColor)
        .attr('transform','translate('+radius+','+textRiseScaleY(config.textVertPosition)+')');

    // The clipping wave area.
    var clipArea = d3.svg.area()
        .x(function(d) { return waveScaleX(d.x); } )
        .y0(function(d) { return waveScaleY(Math.sin(Math.PI*2*config.waveOffset*-1 + Math.PI*2*(1-config.waveCount) + d.y*2*Math.PI));} )
        .y1(function(d) { return (fillCircleRadius*2 + waveHeight); } );
    var waveGroup = gaugeGroup.append("defs")
        .append("clipPath")
        .attr("id", "clipWave" + elementId);
    var wave = waveGroup.append("path")
        .datum(data)
        .attr("d", clipArea)
        .attr("T", 0);

    // The inner circle with the clipping wave attached.
    var fillCircleGroup = gaugeGroup.append("g")
        .attr("clip-path", "url(#clipWave" + elementId + ")");
    fillCircleGroup.append("circle")
        .attr("cx", radius)
        .attr("cy", radius)
        .attr("r", fillCircleRadius)
        .style("fill", config.waveColor);

    // Text where the wave does overlap.
    var text2 = fillCircleGroup.append("text")
        .text(textRounder(textStartValue) + percentText)
        .attr("class", "liquidFillGaugeText")
        .attr("text-anchor", "middle")
        .attr("font-size", textPixels + "px")
        .style("fill", config.waveTextColor)
        .attr('transform','translate('+radius+','+textRiseScaleY(config.textVertPosition)+')');

    // Make the value count up.
    if(config.valueCountUp){
        var textTween = function(){
            var i = d3.interpolate(this.textContent, textFinalValue);
            return function(t) { this.textContent = textRounder(i(t)) + percentText; }
        };
        text1.transition()
            .duration(config.waveRiseTime)
            .tween("text", textTween);
        text2.transition()
            .duration(config.waveRiseTime)
            .tween("text", textTween);
    }

    // Make the wave rise. wave and waveGroup are separate so that horizontal and vertical movement can be controlled independently.
    var waveGroupXPosition = fillCircleMargin+fillCircleRadius*2-waveClipWidth;
    if(config.waveRise){
        waveGroup.attr('transform','translate('+waveGroupXPosition+','+waveRiseScale(0)+')')
            .transition()
            .duration(config.waveRiseTime)
            .attr('transform','translate('+waveGroupXPosition+','+waveRiseScale(fillPercent)+')')
            .each("start", function(){ wave.attr('transform','translate(1,0)'); }); // This transform is necessary to get the clip wave positioned correctly when waveRise=true and waveAnimate=false. The wave will not position correctly without this, but it's not clear why this is actually necessary.
    } else {
        waveGroup.attr('transform','translate('+waveGroupXPosition+','+waveRiseScale(fillPercent)+')');
    }

    if(config.waveAnimate) animateWave();

    function animateWave() {
        wave.attr('transform','translate('+waveAnimateScale(wave.attr('T'))+',0)');
        wave.transition()
            .duration(config.waveAnimateTime * (1-wave.attr('T')))
            .ease('linear')
            .attr('transform','translate('+waveAnimateScale(1)+',0)')
            .attr('T', 1)
            .each('end', function(){
                wave.attr('T', 0);
                animateWave(config.waveAnimateTime);
            });
    }

    function GaugeUpdater(){
        this.update = function(value){
            var newFinalValue = parseFloat(value).toFixed(2);
            var textRounderUpdater = function(value){ return Math.round(value); };
            if(parseFloat(newFinalValue) != parseFloat(textRounderUpdater(newFinalValue))){
                textRounderUpdater = function(value){ return parseFloat(value).toFixed(1); };
            }
            if(parseFloat(newFinalValue) != parseFloat(textRounderUpdater(newFinalValue))){
                textRounderUpdater = function(value){ return parseFloat(value).toFixed(2); };
            }

            var textTween = function(){
                var i = d3.interpolate(this.textContent, parseFloat(value).toFixed(2));
                return function(t) { this.textContent = textRounderUpdater(i(t)) + percentText; }
            };

            text1.transition()
                .duration(config.waveRiseTime)
                .tween("text", textTween);
            text2.transition()
                .duration(config.waveRiseTime)
                .tween("text", textTween);

            var fillPercent = Math.max(config.minValue, Math.min(config.maxValue, value))/config.maxValue;
            var waveHeight = fillCircleRadius*waveHeightScale(fillPercent*100);
            var waveRiseScale = d3.scale.linear()
                // The clipping area size is the height of the fill circle + the wave height, so we position the clip wave
                // such that the it will overlap the fill circle at all when at 0%, and will totally cover the fill
                // circle at 100%.
                .range([(fillCircleMargin+fillCircleRadius*2+waveHeight),(fillCircleMargin-waveHeight)])
                .domain([0,1]);
            var newHeight = waveRiseScale(fillPercent);
            var waveScaleX = d3.scale.linear().range([0,waveClipWidth]).domain([0,1]);
            var waveScaleY = d3.scale.linear().range([0,waveHeight]).domain([0,1]);
            var newClipArea;
            if(config.waveHeightScaling){
                newClipArea = d3.svg.area()
                    .x(function(d) { return waveScaleX(d.x); } )
                    .y0(function(d) { return waveScaleY(Math.sin(Math.PI*2*config.waveOffset*-1 + Math.PI*2*(1-config.waveCount) + d.y*2*Math.PI));} )
                    .y1(function(d) { return (fillCircleRadius*2 + waveHeight); } );
            } else {
                newClipArea = clipArea;
            }

            var newWavePosition = config.waveAnimate?waveAnimateScale(1):0;
            wave.transition()
                .duration(0)
                .transition()
                .duration(config.waveAnimate?(config.waveAnimateTime * (1-wave.attr('T'))):(config.waveRiseTime))
                .ease('linear')
                .attr('d', newClipArea)
                .attr('transform','translate('+newWavePosition+',0)')
                .attr('T','1')
                .each("end", function(){
                    if(config.waveAnimate){
                        wave.attr('transform','translate('+waveAnimateScale(0)+',0)');
                        animateWave(config.waveAnimateTime);
                    }
                });
            waveGroup.transition()
                .duration(config.waveRiseTime)
                .attr('transform','translate('+waveGroupXPosition+','+newHeight+')')
        }
    }

    return new GaugeUpdater();
}
