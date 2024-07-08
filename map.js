// Initialize the map
var map = L.map('map', {
    center: [40.7128, -74.0060], // NYC coordinates
    zoom: 11,
    layers: [] // No base layers
});

// Data lookup object
var dataLookup = {};
var filter = 'alcohol_drugs'; // Default filter set to Alcohol/Drugs
var geojson; // Declare geojson variable here

// Function to update the map based on the selected filter
function updateMap() {
    filter = document.getElementById('data-filter').value;
    if (geojson) {
        geojson.setStyle(styleFeature);
        geojson.eachLayer(function(layer) {
            onEachFeature(layer.feature, layer);
        });
    }
    updateLegend();
}

// Function to style the GeoJSON features based on the filter
function styleFeature(feature) {
    var precinct = feature.properties.precinct ? String(feature.properties.precinct).trim() : '';
    var value = dataLookup[precinct] ? dataLookup[precinct][filter] : 0;
    console.log('Styling feature:', precinct, filter, value); // Debugging
    return {
        fillColor: getColor(value, filter),
        weight: 2,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
    };
}

// Function to get color based on value and filter
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
    } else {
        return '#FFEDA0'; // Default color
    }
}

// Function to capitalize the first letter of each word
function formatFilterName(filter) {
    return filter.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase() });
}

// Highlight feature on mouseover
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

// Reset highlight on mouseout
function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update(); // Clear the info box
}

// Zoom to feature on click
function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
}

// Function to get the centroid of a feature
function getFeatureCenter(feature) {
    var bounds = L.geoJson(feature).getBounds();
    return bounds.getCenter();
}

// Function to calculate rankings based on the selected filter
function calculateRankings() {
    let values = [];

    // Collect values for the current filter
    for (let precinct in dataLookup) {
        if (dataLookup.hasOwnProperty(precinct)) {
            values.push({
                precinct: precinct,
                value: dataLookup[precinct][filter]
            });
        }
    }

    // Sort values in descending order
    values.sort((a, b) => b.value - a.value);

    // Assign rankings
    let rankings = {};
    for (let i = 0; i < values.length; i++) {
        rankings[values[i].precinct] = i + 1; // Ranking starts at 1
    }

    return rankings;
}

// Add interactivity to each feature
function onEachFeature(feature, layer) {
    var precinct = feature.properties.precinct ? String(feature.properties.precinct).trim() : '';
    console.log('Processing precinct:', precinct); // Debugging
    var data = dataLookup[precinct] || {};

    // Add data to feature properties
    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            feature.properties[key] = data[key];
        }
    }

    var rankings = calculateRankings(); // Calculate rankings based on the current filter

    // Create popup content with the selected filter's data and ranking
    var value = data[filter] || 'No data';
    var rank = rankings[precinct] || 'N/A';

    var formattedFilterName = formatFilterName(filter) + ' summons';

    var popupContent = '<b>Precinct ' + precinct + '</b><br />' +
        formattedFilterName + ': ' + value + '<br />' +
        'Ranking: ' + rank;

    layer.on({
        mouseover: function(e) {
            highlightFeature(e);
            var center = getFeatureCenter(feature);
            var popup = L.popup()
                .setLatLng(center)
                .setContent(popupContent)
                .openOn(map);
        },
        mouseout: function(e) {
            resetHighlight(e);
            map.closePopup();
        },
        click: zoomToFeature
    });
}

// Load GeoJSON data for NYC police precincts
fetch('nyc-police-precincts.geojson')
    .then(response => response.json())
    .then(geoData => {
        geojson = L.geoJson(geoData, {
            style: styleFeature,
            onEachFeature: onEachFeature
        }).addTo(map);
    })
    .catch(error => console.error('Error loading GeoJSON data:', error));

// Load CSV data and create data lookup
d3.csv('filtered_vaccination_data.csv', d3.autoType).then(function(vaccinationData) {
    console.log("Loaded CSV Data:", vaccinationData); // Log loaded CSV data
    vaccinationData.forEach(function(d) {
        var precinct = d.precinct ? String(d.precinct).trim() : '';
        console.log('Processing CSV row:', d); // Debugging
        dataLookup[precinct] = {
            alcohol_drugs: +d['ALCOHOL/DRUGS'] || 0,
            animals: +d.ANIMALS || 0,
            bike: +d.BIKE || 0,
            disobey_business: +d['DISOBEY_BUSINESS_AND_STREET_VENDOR_REGULATIONS'] || 0,
            disorderly_behavior: +d['DISORDERLY_BEHAVIOR'] || 0,
            general_illegal: +d['GENERAL_ILLEGAL_BEHAVIOR'] || 0,
            noise: +d.NOISE || 0,
            weapons: +d.WEAPONS || 0
        };
    });

    console.log("Data Lookup Created:", dataLookup); // Debugging: Check data lookup

    // Update the map initially
    if (geojson) {
        geojson.setStyle(styleFeature);
    }
}).catch(function (error) {
    console.error("Error loading cleaned CSV data:", error); // Debugging: Catch CSV errors
});

// Control to show precinct info on hover
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

// Function to update the legend based on the selected filter
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

// Add a legend to the map
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend');
    updateLegend();
    return div;
};

legend.addTo(map);
