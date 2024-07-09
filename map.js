var map = L.map('map', {
    center: [40.7128, -74.0060],
    zoom: 11,
    layers: []
});

var dataLookup = {};
var filter = 'alcohol_drugs';
var geojson;

function updateMap() {
    filter = document.getElementById('data-filter').value;
    if (geojson) {
        geojson.eachLayer(function(layer) {
            var newStyle = styleFeature(layer.feature);
            layer.setStyle(newStyle);
            onEachFeature(layer.feature, layer);
        });
    }
    updateLegend();
}

function styleFeature(feature) {
    var precinct = feature.properties.precinct ? String(feature.properties.precinct).trim() : '';
    var value = dataLookup[precinct] ? dataLookup[precinct][filter] : 0;
    return {
        fillColor: getColor(value, filter),
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}

function getColor(d, filter) {
    if (filter === 'alcohol_drugs') {
        return d > 200 ? '#800026' :
               d > 150 ? '#BD0026' :
               d > 100 ? '#E31A1C' :
               d > 50 ? '#FC4E2A' :
               d > 25 ? '#FD8D3C' :
               d > 10 ? '#FEB24C' :
               d > 5 ? '#FED976' :
                        '#FFEDA0';
    } else if (filter === 'animals') {
        return d > 100 ? '#800026' :
               d > 75 ? '#BD0026' :
               d > 50 ? '#E31A1C' :
               d > 25 ? '#FC4E2A' :
               d > 10 ? '#FD8D3C' :
               d > 5 ? '#FEB24C' :
                       '#FFEDA0';
    } else if (filter === 'bike') {
        return d > 50 ? '#800026' :
               d > 40 ? '#BD0026' :
               d > 30 ? '#E31A1C' :
               d > 20 ? '#FC4E2A' :
               d > 10 ? '#FD8D3C' :
               d > 5 ? '#FEB24C' :
                       '#FFEDA0';
    } else if (filter === 'disobey_business') {
        return d > 150 ? '#800026' :
               d > 100 ? '#BD0026' :
               d > 75 ? '#E31A1C' :
               d > 50 ? '#FC4E2A' :
               d > 25 ? '#FD8D3C' :
               d > 10 ? '#FEB24C' :
                       '#FFEDA0';
    } else if (filter === 'disorderly_behavior') {
        return d > 250 ? '#800026' :
               d > 200 ? '#BD0026' :
               d > 150 ? '#E31A1C' :
               d > 100 ? '#FC4E2A' :
               d > 50 ? '#FD8D3C' :
               d > 25 ? '#FEB24C' :
                       '#FFEDA0';
    } else if (filter === 'noise') {
        return d > 100 ? '#800026' :
               d > 75 ? '#BD0026' :
               d > 50 ? '#E31A1C' :
               d > 25 ? '#FC4E2A' :
               d > 10 ? '#FD8D3C' :
               d > 5 ? '#FEB24C' :
                       '#FFEDA0';
    } else if (filter === 'weapons') {
        return d > 72 ? '#800026' :
               d > 60 ? '#BD0026' :
               d > 48 ? '#E31A1C' :
               d > 36 ? '#FC4E2A' :
               d > 24 ? '#FD8D3C' :
               d > 12 ? '#FEB24C' :
                        '#FFEDA0';
    } else {
        return '#FFEDA0';
    }
}

function formatFilterName(filter) {
    return filter.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase() });
}

function highlightFeature(e) {
    var layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        fillOpacity: 0.7
    });
    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }
    info.update(layer.feature.properties);
}

function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update();
}

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

function getFeatureCenter(feature) {
    var bounds = L.geoJson(feature).getBounds();
    return bounds.getCenter();
}

function calculateRankings() {
    let values = [];
    for (let precinct in dataLookup) {
        if (dataLookup.hasOwnProperty(precinct)) {
            values.push({
                precinct: precinct,
                value: dataLookup[precinct][filter]
            });
        }
    }
    values.sort((a, b) => b.value - a.value);
    let rankings = {};
    for (let i = 0; i < values.length; i++) {
        rankings[values[i].precinct] = i + 1;
    }
    return rankings;
}

function onEachFeature(feature, layer) {
    var precinct = feature.properties.precinct ? String(feature.properties.precinct).trim() : '';
    var data = dataLookup[precinct] || {};
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            feature.properties[key] = data[key];
        }
    }
    var rankings = calculateRankings();
    var value = data[filter] || 'No data';
    var rank = rankings[precinct] || 'N/A';
    var formattedFilterName = formatFilterName(filter) + ' summons';
    var popupContent = '<b>Precinct ' + precinct + '</b><br />' +
        formattedFilterName + ': ' + value + '<br />' +
        'Rank: ' + rank + ' out of 77';
    layer.on({
        mouseover: function(e) {
            highlightFeature(e);
            var center = getFeatureCenter(feature);
            var popup = L.popup()
                .setLatLng(center)
                .setContent(popupContent)
                .openOn(map);
            gsap.fromTo(popup._container, { scale: 0.95 }, { scale: 1, duration: 0.1 });
        },
        mouseout: function(e) {
            resetHighlight(e);
            map.closePopup();
        },
        click: zoomToFeature
    });
}

fetch('nyc-police-precincts.geojson')
    .then(response => response.json())
    .then(geoData => {
        geojson = L.geoJson(geoData, {
            style: styleFeature,
            onEachFeature: onEachFeature
        }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON data:', error));

fetch('filtered_vaccination_data.csv')
    .then(response => response.text())
    .then(csvText => {
        const data = Papa.parse(csvText, { header: true, dynamicTyping: true }).data;
        data.forEach(d => {
            var precinct = d.precinct ? String(d.precinct).trim() : '';
            dataLookup[precinct] = {
                alcohol_drugs: d['ALCOHOL/DRUGS'] || 0,
                animals: d.ANIMALS || 0,
                bike: d.BIKE || 0,
                disobey_business: d['DISOBEY_BUSINESS_AND_STREET_VENDOR_REGULATIONS'] || 0,
                disorderly_behavior: d['DISORDERLY_BEHAVIOR'] || 0,
                general_illegal: d['GENERAL_ILLEGAL_BEHAVIOR'] || 0,
                noise: d.NOISE || 0,
                weapons: d.WEAPONS || 0
            };
        });
        if (geojson) {
            geojson.setStyle(styleFeature);
        }
    })
    .catch(error => console.error("Error loading cleaned CSV data:", error));

var info = L.control();

info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

info.update = function(props) {
    this._div.innerHTML = '<h4>NYC Data</h4>' + (props ?
        '<b>Precinct ' + props.precinct + '</b><br />' +
        'Alcohol/Drugs summons: ' + (props.alcohol_drugs || 'No data') + '<br />' +
        'Animals summons: ' + (props.animals || 'No data') + '<br />' +
        'Bike summons: ' + (props.bike || 'No data') + '<br />' +
        'Disobey Business summons: ' + (props.disobey_business || 'No data') + '<br />' +
        'Disorderly Behavior summons: ' + (props.disorderly_behavior || 'No data') + '<br />' +
        'General Illegal summons: ' + (props.general_illegal || 'No data') + '<br />' +
        'Noise summons: ' + (props.noise || 'No data') + '<br />' +
        'Weapons summons: ' + (props.weapons || 'No data')
        : 'Hover over a precinct');
};

info.addTo(map);

function updateLegend() {
    var grades;
    if (filter === 'alcohol_drugs') {
        grades = [0, 10, 25, 50, 100, 150, 200];
    } else if (filter === 'animals') {
        grades = [0, 5, 10, 25, 50, 75, 100];
    } else if (filter === 'bike') {
        grades = [0, 5, 10, 20, 30, 40, 50];
    } else if (filter === 'disobey_business') {
        grades = [0, 10, 25, 50, 75, 100, 150];
    } else if (filter === 'disorderly_behavior') {
        grades = [0, 25, 50, 100, 150, 200, 250];
    } else if (filter === 'noise') {
        grades = [0, 5, 10, 25, 50, 75, 100];
    } else if (filter === 'weapons') {
        grades = [0, 12, 24, 36, 48, 60, 72];
    } else {
        grades = [0, 5, 10, 15, 20, 25, 30];
    }

    var labels = [];

    for (var i = 0; i < grades.length; i++) {
        labels.push(
            '<i style="background:' + getColor(grades[i] + 1, filter) + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+')
        );
    }

    document.querySelector('.info.legend').innerHTML = labels.join('');
}

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    updateLegend();
    return div;
};

legend.addTo(map);

function searchAddress() {
    var address = document.getElementById('search-box').value;
    if (!address) {
        alert("Please enter an address.");
        return;
    }

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert("Address not found.");
                return;
            }

            var lat = parseFloat(data[0].lat);
            var lon = parseFloat(data[0].lon);
            var latlng = L.latLng(lat, lon);

            var found = false;
            geojson.eachLayer(function(layer) {
                var bounds = layer.getBounds();
                if (bounds.contains(latlng)) {
                    found = true;
                    map.setView(latlng, 14);
                    L.popup()
                        .setLatLng(latlng)
                        .setContent(`<b>Precinct ${layer.feature.properties.precinct}</b>`)
                        .openOn(map);
                    return;
                }
            });

            if (!found) {
                alert("Precinct not found for the given address.");
            }
        })
        .catch(error => {
            console.error("Error geocoding the address:", error);
        });
}
