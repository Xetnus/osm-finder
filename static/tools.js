var elementTypes = {
    linestring_generics: ['highway', 'railway', 'power'],
    node_generics: ['building', 'tower'],
    highway_subtypes: ['vehicle', 'path'],
    railway_subtypes: [/* user defined*/],
    power_subtypes: ['line', 'minor_line'],
    building_subtypes: [/*user defined*/],
    tower_subtypes: ['tower', 'communications_tower', 'water_tower'],
    placeholder_subtypes: [''],
}

function displayLicenseInfo(image_name) {
    if (image_name == '') {
        document.getElementById('license').innerText = '';
        return;
    }
    
    fetch('/static/sample_pictures/README.txt')
        .then(response => response.text())
        .then(function(text) {
            var lines = text.split('\n');

            var i;
            for (i = 0; i < lines.length; i++) {
                if (lines[i].trim() === image_name.trim())
                    break;
            }
            var blurb = 'Image ' + lines[i + 1].toLowerCase() + '\n' + lines[i + 2] + '\n' + lines[i + 3] + '\n' + lines[i + 4];
            document.getElementById('license').innerText = blurb;
        });
}

function createElementFromHtml(html) {
    var template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}

function createTypeElementInput(type, is_generic) {
    var html; 
    if (is_generic) {
        html = '<div id="generic-div"><label id="generic-type-label">Generic Type*</label>';

        if (elementTypes[type].length == 0) {
            html += '<input id="subtype" type="text"></input>'
        } else {
            html += '<select id="generic-type">';
            for (var i = 0; i < elementTypes[type].length; i++) {
                html += '<option value="' + elementTypes[type][i] + '">' + elementTypes[type][i] + '</option>';
            }
            html += '</select>';
        }
        html += '</div>';
    } else {
        html = '<div id="subtype-div"><label id="subtype-label">Subtype</label>';

        if (elementTypes[type].length == 0) {
            html += '<input id="subtype" type="text"></input>'
        } else {
            html += '<select id="subtype">';
            for (var i = 0; i < elementTypes[type].length; i++) {
                html += '<option value="' + elementTypes[type][i] + '">' + elementTypes[type][i] + '</option>';
            }
            html += '</select>';
        }
        html += '</div>';
    }

    return html;
}
